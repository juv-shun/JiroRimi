/// <reference types="vitest/globals" />

import { revalidatePath } from "next/cache"
import { afterEach, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/admin/events/[id]/team-assignment/route"
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
  { length: 10 },
  (_, i) =>
    `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a${String(i + 20).padStart(2, "0")}`,
)

type TableMocks = {
  profiles_select?: {
    data: { role: string } | null
    error: { message: string } | null
  }
  events_select?: {
    data: { id: string; status: string } | null
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
                  data: { id: VALID_EVENT_ID, status: "in_progress" },
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
    `http://localhost/api/admin/events/${VALID_EVENT_ID}/team-assignment`,
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
    matches: [
      {
        team_a_profile_ids: profileIds.slice(0, 5),
        team_b_profile_ids: profileIds.slice(5, 10),
      },
    ],
  }
}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(buildSupabase(ADMIN_USER) as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("admin team assignment API contract test", () => {
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

  it("C03: 参加者重複は400", async () => {
    const duplicatedBody = makeBody([
      PROFILE_IDS[0],
      PROFILE_IDS[1],
      PROFILE_IDS[2],
      PROFILE_IDS[3],
      PROFILE_IDS[4],
      PROFILE_IDS[4],
      PROFILE_IDS[6],
      PROFILE_IDS[7],
      PROFILE_IDS[8],
      PROFILE_IDS[9],
    ])

    const res = await POST(makeRequest(duplicatedBody), makeContext())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("参加者の重複があります")
  })

  it("C04: RPC が競合を返した場合は409", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        rpc: { error: { message: "このラウンドは既に編成済みです" } },
      }) as never,
    )

    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe("このラウンドは既に編成済みです")
  })

  it("C05: 正常系は200で revalidate する", async () => {
    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })
})
