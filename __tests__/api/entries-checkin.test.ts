/// <reference types="vitest/globals" />
import { afterEach, beforeEach, vi } from "vitest"
import { PATCH } from "@/app/api/entries/checkin/route"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

vi.mock("@/lib/supabase/server")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })),
}))

const VALID_USER = { id: "user-uuid" }

interface TableMocks {
  entries_update?: {
    count: number | null
    error: { code?: string; message?: string } | null
  }
}

function buildSupabase(user: object | null, tables: TableMocks = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "entries") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(tables.entries_update ?? { count: 1, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table in mock: "${table}"`)
    }),
  }
}

function makePatchRequest(body: object): Request {
  return new Request("http://localhost/api/entries/checkin", {
    method: "PATCH",
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

describe("entries checkin API contract test", () => {
  it("B01: 未認証は401", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabase(null) as never)

    const res = await PATCH(makePatchRequest({ event_id: "event-uuid" }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe("認証が必要です")
  })

  it("B02: event_id未指定は400", async () => {
    const res = await PATCH(makePatchRequest({}))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("イベントIDが指定されていません")
  })

  it("B03: RLSエラー(42501)は403", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(VALID_USER, {
        entries_update: { count: null, error: { code: "42501", message: "rls" } },
      }) as never,
    )

    const res = await PATCH(makePatchRequest({ event_id: "event-uuid" }))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("チェックインできません。チェックイン時間帯内にお試しください")
  })

  it("B04: 更新件数0は403", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(VALID_USER, {
        entries_update: { count: 0, error: null },
      }) as never,
    )

    const res = await PATCH(makePatchRequest({ event_id: "event-uuid" }))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("チェックインできません。チェックイン時間帯内にお試しください")
  })

  it("B05: 正常系は200", async () => {
    const res = await PATCH(makePatchRequest({ event_id: "event-uuid" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })
})
