import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
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

    // イベント取得（エントリー数も同時取得）
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, entry_type, entry_start, entry_end, max_participants, entries(count)")
      .eq("id", eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: "イベントが見つかりません" },
        { status: 404 },
      )
    }

    // 招待制チェック
    if (event.entry_type === "invite") {
      return NextResponse.json(
        { success: false, error: "招待制イベントにはエントリーできません" },
        { status: 400 },
      )
    }

    // エントリー期間チェック
    const now = new Date()
    const entryStart = new Date(event.entry_start)
    const entryEnd = new Date(event.entry_end)

    if (now < entryStart || now > entryEnd) {
      return NextResponse.json(
        { success: false, error: "エントリー期間外です" },
        { status: 400 },
      )
    }

    // 参加上限チェック
    const entryCount = event.entries[0]?.count ?? 0
    if (event.max_participants !== null && entryCount >= event.max_participants) {
      return NextResponse.json(
        { success: false, error: "参加上限に達しています" },
        { status: 400 },
      )
    }

    // エントリー登録
    const { error: insertError } = await supabase
      .from("entries")
      .insert({ profile_id: user.id, event_id: eventId })

    if (insertError) {
      // ユニーク制約違反（二重エントリー）
      if (insertError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "既にエントリー済みです" },
          { status: 409 },
        )
      }
      console.error("Entry insert error:", insertError)
      return NextResponse.json(
        { success: false, error: "エントリーに失敗しました" },
        { status: 500 },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Entry API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
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

    // イベント取得（期間検証用）
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, entry_start, entry_end")
      .eq("id", eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: "イベントが見つかりません" },
        { status: 404 },
      )
    }

    // エントリー期間チェック
    const now = new Date()
    const entryStart = new Date(event.entry_start)
    const entryEnd = new Date(event.entry_end)

    if (now < entryStart || now > entryEnd) {
      return NextResponse.json(
        { success: false, error: "エントリー期間外です" },
        { status: 400 },
      )
    }

    // エントリー削除
    const { count, error: deleteError } = await supabase
      .from("entries")
      .delete({ count: "exact" })
      .eq("profile_id", user.id)
      .eq("event_id", eventId)

    if (deleteError) {
      console.error("Entry delete error:", deleteError)
      return NextResponse.json(
        { success: false, error: "キャンセルに失敗しました" },
        { status: 500 },
      )
    }

    if (!count) {
      return NextResponse.json(
        { success: false, error: "エントリーが見つかりません" },
        { status: 404 },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Entry cancel API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
