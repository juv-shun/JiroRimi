import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { lobbyNumberSchema } from "@/lib/validations/match"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const parsed = lobbyNumberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "リクエスト形式が不正です" },
        { status: 400 },
      )
    }

    const { id: matchId } = await params

    if (!UUID_REGEX.test(matchId)) {
      return NextResponse.json(
        { success: false, error: "リクエスト形式が不正です" },
        { status: 400 },
      )
    }

    // RLS (matches_update_lobby) が参加者チェック & in_progress チェックを実施
    // トリガー (protect_match_columns) が lobby_number 以外の変更を無効化
    const { count, error: updateError } = await supabase
      .from("matches")
      .update(
        { lobby_number: parsed.data.lobby_number },
        { count: "exact" },
      )
      .eq("id", matchId)

    if (updateError) {
      if (updateError.code === "42501") {
        return NextResponse.json(
          { success: false, error: "ロビー番号を更新できません" },
          { status: 403 },
        )
      }
      console.error("Lobby update error:", updateError)
      return NextResponse.json(
        { success: false, error: "サーバーエラーが発生しました" },
        { status: 500 },
      )
    }

    if (!count) {
      return NextResponse.json(
        { success: false, error: "マッチが見つかりません" },
        { status: 404 },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Lobby API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
