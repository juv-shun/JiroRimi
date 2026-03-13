/// <reference types="vitest/globals" />

import { afterEach, beforeEach, vi } from "vitest"
import { POST } from "@/app/api/admin/events/[id]/ai-team-assignment/route"
import { createClient } from "@/lib/supabase/server"

vi.mock("@/lib/supabase/server")
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })),
}))

const mockGenerateContent = vi.fn()
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = { generateContent: mockGenerateContent }
    },
    Type: {
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      STRING: "STRING",
    },
  }
})

const ADMIN_USER = { id: "admin-uuid" }
const NORMAL_USER = { id: "user-uuid" }
const VALID_EVENT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
const PROFILE_IDS = Array.from(
  { length: 10 },
  (_, i) =>
    `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a${String(i + 20).padStart(2, "0")}`,
)

function buildSupabase(
  user: object | null,
  tables: {
    profiles_select?: {
      data: { role: string } | null
      error: { message: string } | null
    }
    events_select?: {
      data: { id: string; status: string } | null
      error: { message: string } | null
    }
  } = {},
) {
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
  }
}

function makeRequest(body: unknown): Request {
  return new Request(
    `http://localhost/api/admin/events/${VALID_EVENT_ID}/ai-team-assignment`,
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
    participants: profileIds.map((id) => ({
      profileId: id,
      firstRole: "mid" as const,
      secondRole: null,
      thirdRole: null,
    })),
    matchCount: 1,
    standingsMap: {},
  }
}

function makeGeminiResponse(profileIds = PROFILE_IDS) {
  return {
    text: JSON.stringify({
      matches: [
        {
          teamA: profileIds.slice(0, 5),
          teamB: profileIds.slice(5, 10),
        },
      ],
    }),
  }
}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(buildSupabase(ADMIN_USER) as never)
  mockGenerateContent.mockResolvedValue(makeGeminiResponse())
  process.env.GEMINI_API_KEY = "test-api-key"
})

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.GEMINI_API_KEY
})

describe("admin AI team assignment API contract test", () => {
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

  it("C03: 不正JSON / バリデーション失敗は400", async () => {
    const res = await POST(
      makeRequest({ participants: [], matchCount: 0, standingsMap: {} }),
      makeContext(),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe("リクエスト形式が不正です")
  })

  it("C04a: イベント未存在は404", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        events_select: {
          data: null,
          error: { message: "not found" },
        },
      }) as never,
    )

    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe("イベントが見つかりません")
  })

  it("C04b: イベントが進行中でない場合は409", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabase(ADMIN_USER, {
        events_select: {
          data: { id: VALID_EVENT_ID, status: "scheduled" },
          error: null,
        },
      }) as never,
    )

    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe("イベントが進行中ではありません")
  })

  it("C04c: GEMINI_API_KEY 未設定は500", async () => {
    delete process.env.GEMINI_API_KEY

    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe("AI編成機能が利用できません")
  })

  it("C05: Gemini API エラーは502", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API Error"))

    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json.error).toBe("AI編成に失敗しました")
  })

  it("C06: Gemini レスポンス不正（人数不一致）は502", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        matches: [
          {
            teamA: PROFILE_IDS.slice(0, 3),
            teamB: PROFILE_IDS.slice(5, 10),
          },
        ],
      }),
    })

    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json.error).toBe("AI編成の結果が不正です。再試行してください")
  })

  it("C07: 正常系は200", async () => {
    const res = await POST(makeRequest(makeBody()), makeContext())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.matches).toHaveLength(1)
    expect(json.data.matches[0].teamA).toHaveLength(5)
    expect(json.data.matches[0].teamB).toHaveLength(5)
  })
})
