import { GoogleGenAI } from "@google/genai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ROLES } from "@/lib/types/profile"
import {
  AI_TEAM_ASSIGNMENT_RESPONSE_SCHEMA,
  buildTeamAssignmentPrompt,
} from "@/lib/utils/team-assignment-prompt"

type RouteContext = {
  params: Promise<{ id: string }>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const roleEnum = z.enum(ROLES)

const requestSchema = z
  .object({
    participants: z
      .array(
        z.object({
          profileId: z.string().regex(UUID_REGEX),
          firstRole: roleEnum.nullable(),
          secondRole: roleEnum.nullable(),
          thirdRole: roleEnum.nullable(),
        }),
      )
      .min(10),
    matchCount: z.number().int().min(1),
    standingsMap: z.record(
      z.string(),
      z.object({
        wins: z.number().int().min(0),
        losses: z.number().int().min(0),
      }),
    ),
    previousTeams: z
      .array(
        z.object({
          teamA: z.array(z.string().regex(UUID_REGEX)).length(5),
          teamB: z.array(z.string().regex(UUID_REGEX)).length(5),
        }),
      )
      .optional(),
  })
  .refine((data) => data.participants.length === data.matchCount * 10, {
    message: "参加者数とマッチ数が一致しません",
  })

async function authorize(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 },
      ),
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Profile fetch error:", profileError)
    return {
      error: NextResponse.json(
        { success: false, error: "権限の確認に失敗しました" },
        { status: 500 },
      ),
    }
  }

  if (profile?.role !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, error: "管理者権限が必要です" },
        { status: 403 },
      ),
    }
  }

  return { user }
}

function validateGeminiResponse(
  result: unknown,
  participantIds: string[],
  matchCount: number,
): string | null {
  if (
    !result ||
    typeof result !== "object" ||
    !("matches" in result) ||
    !Array.isArray(result.matches)
  ) {
    return "AI編成の結果が不正です。再試行してください"
  }

  const matches = result.matches as { teamA: string[]; teamB: string[] }[]

  if (matches.length !== matchCount) {
    return "AI編成の結果が不正です。再試行してください"
  }

  const allOutputIds: string[] = []

  for (const match of matches) {
    if (
      !Array.isArray(match.teamA) ||
      !Array.isArray(match.teamB) ||
      match.teamA.length !== 5 ||
      match.teamB.length !== 5
    ) {
      return "AI編成の結果が不正です。再試行してください"
    }
    allOutputIds.push(...match.teamA, ...match.teamB)
  }

  if (allOutputIds.length !== participantIds.length) {
    return "AI編成の結果が不正です。再試行してください"
  }

  if (new Set(allOutputIds).size !== allOutputIds.length) {
    return "AI編成の結果が不正です。再試行してください"
  }

  const inputSet = new Set(participantIds)
  const outputSet = new Set(allOutputIds)
  for (const id of inputSet) {
    if (!outputSet.has(id)) {
      return "AI編成の結果が不正です。再試行してください"
    }
  }

  return null
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { success: false, error: "イベントIDの形式が不正です" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const auth = await authorize(supabase)
    if (auth.error) return auth.error

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "リクエスト形式が不正です" },
        { status: 400 },
      )
    }

    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "リクエスト形式が不正です" },
        { status: 400 },
      )
    }

    // イベントの存在・ステータス確認
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, status")
      .eq("id", id)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: "イベントが見つかりません" },
        { status: 404 },
      )
    }

    if (event.status !== "in_progress") {
      return NextResponse.json(
        { success: false, error: "イベントが進行中ではありません" },
        { status: 409 },
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set")
      return NextResponse.json(
        { success: false, error: "AI編成機能が利用できません" },
        { status: 500 },
      )
    }

    const { participants, matchCount, standingsMap, previousTeams } =
      parsed.data

    const prompt = buildTeamAssignmentPrompt({
      participants,
      matchCount,
      standingsMap,
      previousTeams,
    })

    const ai = new GoogleGenAI({ apiKey })

    let result: unknown
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: AI_TEAM_ASSIGNMENT_RESPONSE_SCHEMA,
        },
      })
      result = JSON.parse(response.text ?? "")
    } catch (e) {
      console.error("Gemini API error:", e)
      return NextResponse.json(
        { success: false, error: "AI編成に失敗しました" },
        { status: 502 },
      )
    }

    const participantIds = participants.map((p) => p.profileId)
    const validationError = validateGeminiResponse(
      result,
      participantIds,
      matchCount,
    )
    if (validationError) {
      console.error("Gemini response validation failed:", result)
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (e) {
    console.error("AI team assignment API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
