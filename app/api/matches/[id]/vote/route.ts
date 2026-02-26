import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { voteSchema } from "@/lib/validations/match"

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

    const parsed = voteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "リクエスト形式が不正です" },
        { status: 400 },
      )
    }

    const { id: matchId } = await params

    // RLS (match_participants_update_vote_own) が本人チェック & in_progress チェックを実施
    const { count, error: updateError } = await supabase
      .from("match_participants")
      .update(
        { vote: parsed.data.vote },
        { count: "exact" },
      )
      .eq("match_id", matchId)
      .eq("profile_id", user.id)

    if (updateError) {
      if (updateError.code === "42501") {
        return NextResponse.json(
          { success: false, error: "現在投票できません" },
          { status: 403 },
        )
      }
      console.error("Vote update error:", updateError)
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
    console.error("Vote API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
