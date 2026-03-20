import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    const eventId = searchParams.get("event_id")

    if (!q || q.length < 1) {
      return NextResponse.json(
        { success: false, error: "検索文字列を入力してください" },
        { status: 400 },
      )
    }

    if (eventId && !UUID_REGEX.test(eventId)) {
      return NextResponse.json(
        { success: false, error: "イベントIDの形式が不正です" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // 認証・admin権限チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 },
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json(
        { success: false, error: "権限の確認に失敗しました" },
        { status: 500 },
      )
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "管理者権限が必要です" },
        { status: 403 },
      )
    }

    // プロフィール検索
    let query = supabase
      .from("profiles")
      .select("id, player_name, avatar_url, first_role")
      .ilike("player_name", `%${q}%`)
      .limit(20)

    if (eventId) {
      // 既エントリー者を除外: entries テーブルにevent_idで存在するprofile_idを除く
      const { data: existingEntries } = await supabase
        .from("entries")
        .select("profile_id")
        .eq("event_id", eventId)

      if (existingEntries && existingEntries.length > 0) {
        const excludeIds = existingEntries.map((e) => e.profile_id)
        query = query.not("id", "in", `(${excludeIds.join(",")})`)
      }
    }

    const { data: profiles, error: searchError } = await query

    if (searchError) {
      console.error("Profile search error:", searchError)
      return NextResponse.json(
        { success: false, error: "検索に失敗しました" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: profiles ?? [] })
  } catch (e) {
    console.error("Admin profiles GET error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
