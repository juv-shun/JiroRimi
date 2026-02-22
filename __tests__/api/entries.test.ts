/// <reference types="vitest/globals" />
import { afterEach, beforeEach, vi } from "vitest"
import { DELETE, POST } from "@/app/api/entries/route"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

vi.mock("@/lib/supabase/server")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })),
}))

const VALID_USER = { id: "user-uuid" }

const VALID_EVENT = {
  id: "event-uuid",
  entry_type: "open",
  entry_start: "2024-06-01T00:00:00Z",
  entry_end: "2024-06-30T00:00:00Z",
  max_participants: null,
  gender: null,
  entries: [{ count: 0 }],
}

const VALID_DELETE_EVENT = {
  id: "event-uuid",
  entry_start: "2024-06-01T00:00:00Z",
  entry_end: "2024-06-30T00:00:00Z",
}

interface TableMocks {
  events?: { data: object | null; error: object | null }
  profiles?: { data: object | null; error: object | null }
  entries_insert?: { error: { code?: string; message?: string } | null }
  entries_delete?: { count: number | null; error: object | null }
}

function buildSupabase(user: object | null, tables: TableMocks = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "events") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue(tables.events ?? { data: VALID_EVENT, error: null }),
        }
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(
            tables.profiles ?? { data: { gender: null, role: "user" }, error: null },
          ),
        }
      }
      if (table === "entries") {
        return {
          insert: vi.fn().mockResolvedValue(tables.entries_insert ?? { error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(tables.entries_delete ?? { count: 1, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table in mock: "${table}"`)
    }),
  }
}

function makePostRequest(body: object): Request {
  return new Request("http://localhost/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(body: object): Request {
  return new Request("http://localhost/api/entries", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2024-06-15T10:00:00Z"))
  vi.mocked(createClient).mockResolvedValue(buildSupabase(VALID_USER) as never)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("entries API contract test", () => {
  describe("POST /api/entries", () => {
    it("A01: 未認証は401", async () => {
      vi.mocked(createClient).mockResolvedValue(buildSupabase(null) as never)

      const res = await POST(makePostRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe("認証が必要です")
    })

    it("A02: 不正JSONは400", async () => {
      const request = new Request("http://localhost/api/entries", {
        method: "POST",
        body: "invalid-json",
        headers: { "Content-Type": "application/json" },
      })

      const res = await POST(request)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe("リクエスト形式が不正です")
    })

    it("A03: event_id未指定は400", async () => {
      const res = await POST(makePostRequest({}))
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe("イベントIDが指定されていません")
    })

    it("A04: イベント未存在は404", async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabase(VALID_USER, {
          events: { data: null, error: { message: "not found" } },
        }) as never,
      )

      const res = await POST(makePostRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.error).toBe("イベントが見つかりません")
    })

    it("A05: 招待制イベントは400", async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabase(VALID_USER, {
          events: {
            data: { ...VALID_EVENT, entry_type: "invite" },
            error: null,
          },
        }) as never,
      )

      const res = await POST(makePostRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe("招待制イベントにはエントリーできません")
    })

    it("A06: 性別不一致は403", async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabase(VALID_USER, {
          events: { data: { ...VALID_EVENT, gender: "boys" }, error: null },
          profiles: { data: { gender: "girls", role: "user" }, error: null },
        }) as never,
      )

      const res = await POST(makePostRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error).toBe("このイベントはボーイズ限定です")
    })

    it("A07: エントリー期間外は400", async () => {
      vi.setSystemTime(new Date("2024-05-31T10:00:00Z"))

      const res = await POST(makePostRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe("エントリー期間外です")
    })

    it("A08: 重複エントリーは409", async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabase(VALID_USER, {
          entries_insert: { error: { code: "23505", message: "duplicate" } },
        }) as never,
      )

      const res = await POST(makePostRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(409)
      expect(json.error).toBe("既にエントリー済みです")
    })

    it("A09: 正常系は200", async () => {
      const res = await POST(makePostRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
    })
  })

  describe("DELETE /api/entries", () => {
    it("A10: 未認証は401", async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabase(null, {
          events: { data: VALID_DELETE_EVENT, error: null },
        }) as never,
      )

      const res = await DELETE(makeDeleteRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe("認証が必要です")
    })

    it("A11: エントリー期間外は400", async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabase(VALID_USER, {
          events: { data: VALID_DELETE_EVENT, error: null },
        }) as never,
      )
      vi.setSystemTime(new Date("2024-05-31T10:00:00Z"))

      const res = await DELETE(makeDeleteRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe("エントリー期間外です")
    })

    it("A12: エントリー未存在は404", async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabase(VALID_USER, {
          events: { data: VALID_DELETE_EVENT, error: null },
          entries_delete: { count: 0, error: null },
        }) as never,
      )

      const res = await DELETE(makeDeleteRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.error).toBe("エントリーが見つかりません")
    })

    it("A13: 正常系は200", async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildSupabase(VALID_USER, {
          events: { data: VALID_DELETE_EVENT, error: null },
        }) as never,
      )

      const res = await DELETE(makeDeleteRequest({ event_id: "event-uuid" }))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })
})
