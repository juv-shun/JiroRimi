import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ id: string }>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

export async function PATCH(_request: Request, context: RouteContext) {
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

    // イベント取得
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, status, matches_per_event")
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

    // 全マッチ取得
    const { data: allMatches, error: matchError } = await supabase
      .from("matches")
      .select("id, status, round_number")
      .eq("event_id", id)

    if (matchError) {
      console.error("Match fetch error:", matchError)
      return NextResponse.json(
        { success: false, error: "サーバーエラーが発生しました" },
        { status: 500 },
      )
    }

    // waiting/in_progress のマッチが残っていないか
    const incompleteMatches = (allMatches ?? []).filter(
      (m) => m.status === "waiting" || m.status === "in_progress",
    )
    if (incompleteMatches.length > 0) {
      return NextResponse.json(
        { success: false, error: "未完了のマッチが残っています" },
        { status: 400 },
      )
    }

    // 全ラウンド(1〜matches_per_event)が confirmed で埋まっているか
    const confirmedRounds = new Set(
      (allMatches ?? [])
        .filter((m) => m.status === "confirmed")
        .map((m) => m.round_number),
    )
    for (let rn = 1; rn <= event.matches_per_event; rn++) {
      if (!confirmedRounds.has(rn)) {
        return NextResponse.json(
          { success: false, error: "全ラウンドが完了していません" },
          { status: 400 },
        )
      }
    }

    // 原子的ステータス更新
    const { count, error: updateError } = await supabase
      .from("events")
      .update(
        { status: "completed" },
        { count: "exact" },
      )
      .eq("id", id)
      .eq("status", "in_progress")

    if (updateError) {
      console.error("Event complete error:", updateError)
      return NextResponse.json(
        { success: false, error: "サーバーエラーが発生しました" },
        { status: 500 },
      )
    }

    if (!count) {
      return NextResponse.json(
        { success: false, error: "イベントは既に完了しています" },
        { status: 409 },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Event complete API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
