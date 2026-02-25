/// <reference types="vitest/globals" />
import { afterEach, beforeEach, vi } from "vitest"
import { PATCH, DELETE } from "@/app/api/admin/entries/[id]/checkin/route"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

vi.mock("@/lib/supabase/server")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })),
}))

const ADMIN_USER = { id: "admin-uuid" }
const NORMAL_USER = { id: "user-uuid" }
const VALID_ENTRY_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

interface TableMocks {
  profiles_select?: {
    data: { role: string } | null
    error: { code?: string; message?: string } | null
  }
  entries_update?: {
    count: number | null
    error: { code?: string; message?: string } | null
  }
}

function buildSupabase(user: object | null, tables: TableMocks = {}) {
  let entriesCallCount = 0
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                tables.profiles_select ?? { data: { role: "admin" }, error: null },
              ),
            }),
          }),
        }
      }
      if (table === "entries") {
        entriesCallCount++
        // 1回目: select (イベントステータス確認)
        if (entriesCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { event_id: "event-uuid", events: { status: "scheduled" } },
                  error: null,
                }),
              }),
            }),
          }
        }
        // 2回目: update (チェックイン操作)
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(
              tables.entries_update ?? { count: 1, error: null },
            ),
          }),
        }
      }
      throw new Error(`Unexpected table in mock: "${table}"`)
    }),
  }
}

function makeRequest(method: string): Request {
  return new Request(`http://localhost/api/admin/entries/${VALID_ENTRY_ID}/checkin`, {
    method,
  })
}

function makeContext(id: string = VALID_ENTRY_ID) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(buildSupabase(ADMIN_USER) as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("admin entries checkin API contract test", () => {
  // PATCH tests
  it("C01: PATCH 未認証は401", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabase(null) as never)

    const res = await PATCH(makeRequest("PATCH"), makeContext())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe("認証が必要です")
  })

  it("C02: PATCH 非adminは403", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(NORMAL_USER, {
        profiles_select: { data: { role: "user" }, error: null },
      }) as never,
    )

    const res = await PATCH(makeRequest("PATCH"), makeContext())
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("管理者権限が必要です")
  })

  it("C03: PATCH エントリー不存在は404", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        entries_update: { count: 0, error: null },
      }) as never,
    )

    const res = await PATCH(makeRequest("PATCH"), makeContext())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe("エントリーが見つかりません")
  })

  it("C04: PATCH 正常系は200", async () => {
    const res = await PATCH(makeRequest("PATCH"), makeContext())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("C07: PATCH 不正なUUIDは400", async () => {
    const res = await PATCH(makeRequest("PATCH"), makeContext("invalid-id"))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("エントリーIDの形式が不正です")
  })

  it("C08: PATCH profiles取得エラーは500", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        profiles_select: { data: null, error: { message: "db error" } },
      }) as never,
    )

    const res = await PATCH(makeRequest("PATCH"), makeContext())
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe("権限の確認に失敗しました")
  })

  // DELETE tests
  it("C05: DELETE 未認証は401", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabase(null) as never)

    const res = await DELETE(makeRequest("DELETE"), makeContext())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe("認証が必要です")
  })

  it("C06: DELETE 正常系は200", async () => {
    const res = await DELETE(makeRequest("DELETE"), makeContext())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("C09: DELETE エントリー不存在は404", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        entries_update: { count: 0, error: null },
      }) as never,
    )

    const res = await DELETE(makeRequest("DELETE"), makeContext())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe("エントリーが見つかりません")
  })
})
