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

    const { round_number } = parsed.data

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

    // 対象ラウンドのマッチ数取得
    const { count: roundMatchCount, error: matchCountError } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("round_number", round_number)

    if (matchCountError) {
      console.error("Match count error:", matchCountError)
      return NextResponse.json(
        { success: false, error: "サーバーエラーが発生しました" },
        { status: 500 },
      )
    }

    if (!roundMatchCount || roundMatchCount === 0) {
      return NextResponse.json(
        { success: false, error: "対象ラウンドのマッチが見つかりません" },
        { status: 404 },
      )
    }

    // 条件付き一括更新: waiting → in_progress
    const { count: updatedCount, error: updateError } = await supabase
      .from("matches")
      .update(
        { status: "in_progress" },
        { count: "exact" },
      )
      .eq("event_id", id)
      .eq("round_number", round_number)
      .eq("status", "waiting")

    if (updateError) {
      console.error("Match update error:", updateError)
      return NextResponse.json(
        { success: false, error: "サーバーエラーが発生しました" },
        { status: 500 },
      )
    }

    if (updatedCount !== roundMatchCount) {
      return NextResponse.json(
        { success: false, error: "マッチは既に開始されています" },
        { status: 409 },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Match start API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
