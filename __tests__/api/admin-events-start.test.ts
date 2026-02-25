/// <reference types="vitest/globals" />
import { afterEach, beforeEach, vi } from "vitest"
import { PATCH } from "@/app/api/admin/events/[id]/start/route"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

vi.mock("@/lib/supabase/server")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })),
}))

const ADMIN_USER = { id: "admin-uuid" }
const NORMAL_USER = { id: "user-uuid" }
const VALID_EVENT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

// 10人分のチェックイン済みエントリーID
const ENTRY_IDS = Array.from({ length: 12 }, (_, i) =>
  `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a${String(i + 10).padStart(2, "0")}`,
)

interface TableMocks {
  profiles_select?: {
    data: { role: string } | null
    error: { code?: string; message?: string } | null
  }
  entries_select?: {
    data: { id: string }[] | null
    error: { code?: string; message?: string } | null
  }
  events_update?: {
    count: number | null
    error: { code?: string; message?: string } | null
  }
  events_select?: {
    data: { status: string } | null
    error: { code?: string; message?: string } | null
  }
  entries_update?: {
    error: { code?: string; message?: string } | null
  }
}

function buildSupabase(user: object | null, tables: TableMocks = {}) {
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
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue(
                tables.entries_select ?? {
                  data: ENTRY_IDS.slice(0, 10).map((id) => ({ id })),
                  error: null,
                },
              ),
            }),
          }),
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue(
              tables.entries_update ?? { error: null },
            ),
          }),
        }
      }
      if (table === "events") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(
                tables.events_update ?? { count: 1, error: null },
              ),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                tables.events_select ?? { data: { status: "scheduled" }, error: null },
              ),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table in mock: "${table}"`)
    }),
  }
}

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/admin/events/${VALID_EVENT_ID}/start`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeContext(id: string = VALID_EVENT_ID) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(buildSupabase(ADMIN_USER) as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("admin events start API contract test", () => {
  it("C01: 未認証は401", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabase(null) as never)

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe("認証が必要です")
  })

  it("C02: 非adminは403", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(NORMAL_USER, {
        profiles_select: { data: { role: "user" }, error: null },
      }) as never,
    )

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("管理者権限が必要です")
  })

  it("C03: UUID形式不正は400", async () => {
    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [] }),
      makeContext("invalid-id"),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("イベントIDの形式が不正です")
  })

  it("C04: 参加人数が10の倍数でないは400", async () => {
    // 12人チェックイン、除外1人 → 11人（10の倍数でない）
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        entries_select: {
          data: ENTRY_IDS.slice(0, 12).map((id) => ({ id })),
          error: null,
        },
      }) as never,
    )

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [ENTRY_IDS[0]] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("参加人数が10の倍数ではありません")
  })

  it("C05: 参加人数が10人未満は400", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        entries_select: {
          data: ENTRY_IDS.slice(0, 5).map((id) => ({ id })),
          error: null,
        },
      }) as never,
    )

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("参加人数が10人未満です")
  })

  it("C06: 無効な除外対象は400", async () => {
    const invalidId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99"

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [invalidId] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("無効な除外対象が含まれています")
  })

  it("C07: update count=0 + selectで不存在は404", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        events_update: { count: 0, error: null },
        events_select: { data: null, error: null },
      }) as never,
    )

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe("イベントが見つかりません")
  })

  it("C08: update count=0 + selectでin_progressは409", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        events_update: { count: 0, error: null },
        events_select: { data: { status: "in_progress" }, error: null },
      }) as never,
    )

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe("イベントは既に開始されています")
  })

  it("C09: 正常系（除外あり）は200", async () => {
    // 12人チェックイン、2人除外 → 10人参加
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        entries_select: {
          data: ENTRY_IDS.slice(0, 12).map((id) => ({ id })),
          error: null,
        },
      }) as never,
    )

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [ENTRY_IDS[10], ENTRY_IDS[11]] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("C10: 正常系（除外なし、ちょうど10の倍数）は200", async () => {
    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("C11: 重複IDを含むexcluded_entry_idsは重複排除後に正常処理", async () => {
    // 12人チェックイン、重複含む除外 → 実質2人除外で10人参加
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        entries_select: {
          data: ENTRY_IDS.slice(0, 12).map((id) => ({ id })),
          error: null,
        },
      }) as never,
    )

    const res = await PATCH(
      makeRequest({
        excluded_entry_ids: [ENTRY_IDS[10], ENTRY_IDS[11], ENTRY_IDS[10]],
      }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it("C12: profiles取得エラーは500", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        profiles_select: { data: null, error: { message: "db error" } },
      }) as never,
    )

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe("権限の確認に失敗しました")
  })

  it("C13: update DBエラーは500", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        events_update: { count: null, error: { message: "db error" } },
      }) as never,
    )

    const res = await PATCH(
      makeRequest({ excluded_entry_ids: [] }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe("イベントの更新に失敗しました")
  })
})
