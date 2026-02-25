import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "リクエスト形式が不正です" },
        { status: 400 },
      )
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { success: false, error: "リクエスト形式が不正です" },
        { status: 400 },
      )
    }

    const eventId = (body as Record<string, unknown>).event_id

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { success: false, error: "イベントIDが指定されていません" },
        { status: 400 },
      )
    }

    // イベントステータス確認（開始後はチェックイン不可）
    const { data: eventData, error: eventFetchError } = await supabase
      .from("events")
      .select("status")
      .eq("id", eventId)
      .single()

    if (eventFetchError) {
      console.error("Event fetch error:", eventFetchError)
      return NextResponse.json(
        { success: false, error: "イベントの確認に失敗しました" },
        { status: 500 },
      )
    }

    if (eventData.status !== "scheduled") {
      return NextResponse.json(
        { success: false, error: "イベント開始後はチェックインできません" },
        { status: 400 },
      )
    }

    // チェックイン実行
    // - RLS (entries_update_checkin_own) が本人確認・時間帯・未チェックイン済みを検証
    //   USING: profile_id = auth.uid() AND checked_in_at IS NULL
    //   → 既チェックイン行は UPDATE 対象外（再チェックイン不可）
    // - protect_entry_columns トリガーが checked_in_at をサーバー時刻 now() に強制
    const { count, error: updateError } = await supabase
      .from("entries")
      .update(
        { checked_in_at: new Date().toISOString() },
        { count: "exact" },
      )
      .eq("profile_id", user.id)
      .eq("event_id", eventId)

    if (updateError) {
      // RLS の WITH CHECK 違反（USING は通ったが時間帯外等）は 42501 エラー
      if (updateError.code === "42501") {
        return NextResponse.json(
          {
            success: false,
            error:
              "チェックインできません。チェックイン時間帯内にお試しください",
          },
          { status: 403 },
        )
      }
      console.error("Checkin update error:", updateError)
      return NextResponse.json(
        { success: false, error: "チェックインに失敗しました" },
        { status: 500 },
      )
    }

    if (!count) {
      // RLS の USING 条件で行が不可視（未エントリー / 既チェックイン済み）
      return NextResponse.json(
        {
          success: false,
          error:
            "チェックインできません。チェックイン時間帯内にお試しください",
        },
        { status: 403 },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Checkin API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
