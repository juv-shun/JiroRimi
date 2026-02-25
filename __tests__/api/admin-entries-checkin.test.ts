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
const ENTRY_ID = "entry-uuid"

interface TableMocks {
  profiles_select?: {
    data: { role: string } | null
    error: null
  }
  entries_update?: {
    count: number | null
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
  return new Request(`http://localhost/api/admin/entries/${ENTRY_ID}/checkin`, {
    method,
  })
}

function makeContext() {
  return { params: Promise.resolve({ id: ENTRY_ID }) }
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
})
