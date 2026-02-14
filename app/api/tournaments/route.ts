import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { tournamentCreateSchema } from "@/lib/validations/tournament"

/** datetime-local の値を timestamptz（JST）に変換 */
const toTimestamptz = (dt: string): string => `${dt}:00+09:00`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 },
      )
    }

    // admin権限チェック
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("プロフィール取得エラー:", profileError.message)
      return NextResponse.json(
        { success: false, error: "権限の確認に失敗しました" },
        { status: 500 },
      )
    }

    if (profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "管理者権限が必要です" },
        { status: 403 },
      )
    }

    // リクエストボディのバリデーション
    const body = await request.json()
    const parsed = tournamentCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "入力内容に不備があります" },
        { status: 400 },
      )
    }

    const data = parsed.data

    // 大会INSERT
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .insert({
        name: data.name,
        is_boys: data.is_boys,
        is_girls: data.is_girls,
        matches_per_event: data.matches_per_event,
        gf_advance_count: data.gf_advance_count,
        max_participants:
          data.max_participants && !Number.isNaN(data.max_participants)
            ? data.max_participants
            : null,
        rules: data.rules || null,
        status: "draft",
      })
      .select("id")
      .single()

    if (tournamentError || !tournament) {
      console.error("大会INSERT失敗:", tournamentError?.message)
      return NextResponse.json(
        { success: false, error: "大会の作成に失敗しました" },
        { status: 500 },
      )
    }

    // イベント一括INSERT
    const eventsToInsert = data.events.map((q, index) => ({
      tournament_id: tournament.id,
      event_number: index + 1,
      event_type: "qualifier" as const,
      match_format: "swiss" as const,
      scheduled_date: q.scheduled_date,
      entry_start: toTimestamptz(q.entry_start),
      entry_end: toTimestamptz(q.entry_end),
      checkin_start: toTimestamptz(q.checkin_start),
      checkin_end: toTimestamptz(q.checkin_end),
      rules: q.rules || null,
      status: "scheduled",
    }))

    const { error: eventsError } = await supabase
      .from("events")
      .insert(eventsToInsert)

    if (eventsError) {
      console.error("イベントINSERT失敗:", eventsError.message)

      // 擬似トランザクション: イベントINSERT失敗時は大会を削除
      const { error: deleteError } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournament.id)

      if (deleteError) {
        console.error("ロールバック失敗（大会削除）:", deleteError.message)
      }

      return NextResponse.json(
        { success: false, error: "イベントの作成に失敗しました" },
        { status: 500 },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("大会作成エラー:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
