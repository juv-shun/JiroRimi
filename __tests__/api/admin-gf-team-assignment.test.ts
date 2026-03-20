/// <reference types="vitest/globals" />

import { revalidatePath } from "next/cache"
import { afterEach, beforeEach, describe, it, vi } from "vitest"
import { POST } from "@/app/api/admin/events/[id]/gf-team-assignment/route"
import { createClient } from "@/lib/supabase/server"

vi.mock("@/lib/supabase/server")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })),
}))

const ADMIN_USER = { id: "admin-uuid" }
const NORMAL_USER = { id: "user-uuid" }
const VALID_EVENT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
const PROFILE_IDS = Array.from(
  { length: 20 },
  (_, i) =>
    `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a${String(i + 20).padStart(2, "0")}`,
)

type TableMocks = {
  profiles_select?: {
    data: { role: string } | null
    error: { message: string } | null
  }
  events_select?: {
    data: { id: string; status: string; match_format: string } | null
    error: { message: string } | null
  }
  rpc?: {
    error: { message: string } | null
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
                tables.profiles_select ?? {
                  data: { role: "admin" },
                  error: null,
                },
              ),
            }),
          }),
        }
      }
      if (table === "events") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                tables.events_select ?? {
                  data: {
                    id: VALID_EVENT_ID,
                    status: "in_progress",
                    match_format: "double_elimination",
                  },
                  error: null,
                },
              ),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table in mock: "${table}"`)
    }),
    rpc: vi.fn().mockResolvedValue(
      tables.rpc ?? {
        error: null,
      },
    ),
  }
}

function makeRequest(body: unknown): Request {
  return new Request(
    `http://localhost/api/admin/events/${VALID_EVENT_ID}/gf-team-assignment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}

function makeContext(id: string = VALID_EVENT_ID) {
  return { params: Promise.resolve({ id }) }
}

function makeBody(profileIds = PROFILE_IDS) {
  return {
    teams: [
      { seed: 1, name: "チーム1", member_profile_ids: profileIds.slice(0, 5) },
      { seed: 2, name: "チーム2", member_profile_ids: profileIds.slice(5, 10) },
      { seed: 3, name: "チーム3", member_profile_ids: profileIds.slice(10, 15) },
      { seed: 4, name: "チーム4", member_profile_ids: profileIds.slice(15, 20) },
    ],
  }
}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(buildSupabase(ADMIN_USER) as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("admin GF team assignment API contract test", () => {
  it("C01: 未認証は401", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabase(null) as never)

    const res = await POST(makeRequest(makeBody()), makeContext())
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

    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("管理者権限が必要です")
  })

  it("C03: qualifierイベントは409", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        events_select: {
          data: {
            id: VALID_EVENT_ID,
            status: "in_progress",
            match_format: "qualifier",
          },
          error: null,
        },
      }) as never,
    )

    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe("ダブルエリミネーションイベントではありません")
  })

  it("C04: 既に編成済みは409", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        rpc: { error: { message: "チーム編成は既に確定済みです" } },
      }) as never,
    )

    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe("チーム編成は既に確定済みです")
  })

  it("C05: 正常系は200でrevalidateする", async () => {
    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })
})

describe("GF team assignment zod validation", () => {
  it("V01: チーム数が4でない場合は400", async () => {
    const body = {
      teams: [
        { seed: 1, name: "チーム1", member_profile_ids: PROFILE_IDS.slice(0, 5) },
        { seed: 2, name: "チーム2", member_profile_ids: PROFILE_IDS.slice(5, 10) },
      ],
    }

    const res = await POST(makeRequest(body), makeContext())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("リクエスト形式が不正です")
  })

  it("V02: メンバー数が5でない場合は400", async () => {
    const body = {
      teams: [
        { seed: 1, name: "チーム1", member_profile_ids: PROFILE_IDS.slice(0, 3) },
        { seed: 2, name: "チーム2", member_profile_ids: PROFILE_IDS.slice(5, 10) },
        { seed: 3, name: "チーム3", member_profile_ids: PROFILE_IDS.slice(10, 15) },
        { seed: 4, name: "チーム4", member_profile_ids: PROFILE_IDS.slice(15, 20) },
      ],
    }

    const res = await POST(makeRequest(body), makeContext())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("リクエスト形式が不正です")
  })

  it("V03: seed範囲外は400", async () => {
    const body = {
      teams: [
        { seed: 0, name: "チーム1", member_profile_ids: PROFILE_IDS.slice(0, 5) },
        { seed: 2, name: "チーム2", member_profile_ids: PROFILE_IDS.slice(5, 10) },
        { seed: 3, name: "チーム3", member_profile_ids: PROFILE_IDS.slice(10, 15) },
        { seed: 4, name: "チーム4", member_profile_ids: PROFILE_IDS.slice(15, 20) },
      ],
    }

    const res = await POST(makeRequest(body), makeContext())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("リクエスト形式が不正です")
  })

  it("V04: チーム名空文字は400", async () => {
    const body = {
      teams: [
        { seed: 1, name: "", member_profile_ids: PROFILE_IDS.slice(0, 5) },
        { seed: 2, name: "チーム2", member_profile_ids: PROFILE_IDS.slice(5, 10) },
        { seed: 3, name: "チーム3", member_profile_ids: PROFILE_IDS.slice(10, 15) },
        { seed: 4, name: "チーム4", member_profile_ids: PROFILE_IDS.slice(15, 20) },
      ],
    }

    const res = await POST(makeRequest(body), makeContext())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("リクエスト形式が不正です")
  })

  it("V05: 参加者重複は400", async () => {
    const body = makeBody()
    body.teams[1].member_profile_ids[0] = PROFILE_IDS[0] // 重複

    const res = await POST(makeRequest(body), makeContext())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("参加者の重複があります")
  })
})
