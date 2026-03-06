import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ id: string }>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const requestSchema = z.object({
  round_number: z.number().int().min(1),
  results: z
    .array(
      z.object({
        match_id: z.string().uuid(),
        result: z.enum(["team_a", "team_b"]),
      }),
    )
    .min(1),
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

export async function PATCH(request: Request, context: RouteContext) {
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

    // リクエストボディのパース
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

    const { round_number, results } = parsed.data

    // イベント存在 & status 確認
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

    // 対象ラウンドのマッチ取得
    const { data: roundMatches, error: matchError } = await supabase
      .from("matches")
      .select("id, status")
      .eq("event_id", id)
      .eq("round_number", round_number)

    if (matchError) {
      console.error("Match fetch error:", matchError)
      return NextResponse.json(
        { success: false, error: "サーバーエラーが発生しました" },
        { status: 500 },
      )
    }

    if (!roundMatches || roundMatches.length === 0) {
      return NextResponse.json(
        { success: false, error: "対象ラウンドのマッチが見つかりません" },
        { status: 404 },
      )
    }

    // results 配列のマッチ数 = ラウンドマッチ数
    if (results.length !== roundMatches.length) {
      return NextResponse.json(
        { success: false, error: "全マッチの結果を指定してください" },
        { status: 400 },
      )
    }

    // results の match_id が全て対象ラウンドに属するか
    const roundMatchIds = new Set(roundMatches.map((m) => m.id))
    for (const r of results) {
      if (!roundMatchIds.has(r.match_id)) {
        return NextResponse.json(
          { success: false, error: "無効なマッチIDが含まれています" },
          { status: 400 },
        )
      }
    }

    // 全マッチが in_progress であることを確認
    const nonInProgress = roundMatches.filter(
      (m) => m.status !== "in_progress",
    )
    if (nonInProgress.length > 0) {
      return NextResponse.json(
        { success: false, error: "マッチが進行中ではありません" },
        { status: 409 },
      )
    }

    // 各マッチを更新
    for (const r of results) {
      const { count, error: updateError } = await supabase
        .from("matches")
        .update(
          { result: r.result, status: "confirmed" },
          { count: "exact" },
        )
        .eq("id", r.match_id)
        .eq("status", "in_progress")

      if (updateError) {
        console.error("Match confirm error:", updateError)
        return NextResponse.json(
          { success: false, error: "サーバーエラーが発生しました" },
          { status: 500 },
        )
      }

      if (!count) {
        return NextResponse.json(
          { success: false, error: "マッチは既に確定されています" },
          { status: 409 },
        )
      }
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Match confirm API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
