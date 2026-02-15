import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { datetimeLocalToTimestamptz } from "@/lib/utils/datetime"
import { tournamentUpdateSchema } from "@/lib/validations/tournament"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
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
    const parsed = tournamentUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "入力内容に不備があります" },
        { status: 400 },
      )
    }

    const data = parsed.data

    // 大会UPDATE
    const { error: tournamentError } = await supabase
      .from("tournaments")
      .update({
        name: data.name,
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (tournamentError) {
      console.error("大会UPDATE失敗:", tournamentError.message)
      return NextResponse.json(
        { success: false, error: "大会の更新に失敗しました" },
        { status: 500 },
      )
    }

    // 既存イベント取得
    const { data: existingEvents, error: existingEventsError } = await supabase
      .from("events")
      .select("id, event_number")
      .eq("tournament_id", id)
      .order("event_number", { ascending: true })

    if (existingEventsError) {
      console.error("既存イベント取得失敗:", existingEventsError.message)
      return NextResponse.json(
        { success: false, error: "イベント情報の取得に失敗しました" },
        { status: 500 },
      )
    }

    const existingEventIds = new Set(existingEvents.map((e) => e.id))
    const requestEventIds = new Set(
      data.events.filter((e) => e.id).map((e) => e.id as string),
    )

    // リクエスト内のイベントIDが当該大会に所属するか検証
    for (const eventId of requestEventIds) {
      if (!existingEventIds.has(eventId)) {
        return NextResponse.json(
          { success: false, error: "不正なイベントIDが含まれています" },
          { status: 400 },
        )
      }
    }

    // DB にあるがリクエストにないイベント → DELETE
    const eventsToDelete = existingEvents.filter(
      (e) => !requestEventIds.has(e.id),
    )
    if (eventsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("events")
        .delete()
        .in(
          "id",
          eventsToDelete.map((e) => e.id),
        )

      if (deleteError) {
        console.error("イベント削除失敗:", deleteError.message)
        return NextResponse.json(
          { success: false, error: "イベントの削除に失敗しました" },
          { status: 500 },
        )
      }
    }

    // 新規イベントの event_number 採番用
    const maxEventNumber = existingEvents.reduce(
      (max, e) => Math.max(max, e.event_number),
      0,
    )
    let nextEventNumber = maxEventNumber + 1

    // イベントの更新・追加
    for (const ev of data.events) {
      const eventData = {
        name: ev.name,
        entry_type: ev.entry_type,
        match_format: ev.match_format,
        matches_per_event: ev.matches_per_event,
        max_participants:
          ev.max_participants && !Number.isNaN(ev.max_participants)
            ? ev.max_participants
            : null,
        scheduled_date: ev.scheduled_date,
        entry_start: datetimeLocalToTimestamptz(ev.entry_start),
        entry_end: datetimeLocalToTimestamptz(ev.entry_end),
        checkin_start: datetimeLocalToTimestamptz(ev.checkin_start),
        checkin_end: datetimeLocalToTimestamptz(ev.checkin_end),
        rules: ev.rules || null,
        updated_at: new Date().toISOString(),
      }

      if (ev.id) {
        // 既存イベント → UPDATE（event_number は変更しない）
        const { error: updateError } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", ev.id)

        if (updateError) {
          console.error("イベントUPDATE失敗:", updateError.message)
          return NextResponse.json(
            { success: false, error: "イベントの更新に失敗しました" },
            { status: 500 },
          )
        }
      } else {
        // 新規イベント → INSERT
        const { error: insertError } = await supabase.from("events").insert({
          ...eventData,
          tournament_id: id,
          event_number: nextEventNumber,
          status: "scheduled",
        })

        if (insertError) {
          console.error("イベントINSERT失敗:", insertError.message)
          return NextResponse.json(
            { success: false, error: "イベントの追加に失敗しました" },
            { status: 500 },
          )
        }

        nextEventNumber++
      }
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("大会更新エラー:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
