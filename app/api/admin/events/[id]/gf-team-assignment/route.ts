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
  teams: z
    .array(
      z.object({
        seed: z.number().int().min(1).max(4),
        name: z.string().min(1).max(20),
        member_profile_ids: z
          .array(z.string().regex(UUID_REGEX))
          .length(5),
      }),
    )
    .length(4),
})

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    // 1. event_id UUID形式チェック
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { success: false, error: "イベントIDの形式が不正です" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // 2. 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 },
      )
    }

    // 3. admin権限チェック
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

    // 4. リクエストボディのパース・バリデーション
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

    // 5. profile_id 全体の重複チェック（20人がユニーク）
    const allProfileIds = parsed.data.teams.flatMap(
      (t) => t.member_profile_ids,
    )
    if (new Set(allProfileIds).size !== allProfileIds.length) {
      return NextResponse.json(
        { success: false, error: "参加者の重複があります" },
        { status: 400 },
      )
    }

    // 6. イベントの存在確認 + match_format チェック
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, status, match_format")
      .eq("id", id)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: "イベントが見つかりません" },
        { status: 404 },
      )
    }

    if (event.match_format !== "double_elimination") {
      return NextResponse.json(
        { success: false, error: "ダブルエリミネーションイベントではありません" },
        { status: 409 },
      )
    }

    if (event.status !== "in_progress") {
      return NextResponse.json(
        { success: false, error: "イベントが進行中ではありません" },
        { status: 409 },
      )
    }

    // 7. RPC呼び出し
    const { error: rpcError } = await supabase.rpc("create_gf_teams", {
      p_event_id: id,
      p_teams: parsed.data.teams,
    })

    if (rpcError) {
      console.error("GF team assignment error:", rpcError)

      const message = rpcError.message
      const status =
        message === "チーム編成は既に確定済みです" ||
        message === "イベントが進行中ではありません" ||
        message === "ダブルエリミネーションイベントではありません"
          ? 409
          : message === "参加者リストがチェックイン済みエントリーと一致しません" ||
              message === "参加者の重複があります"
            ? 400
            : message === "イベントが見つかりません"
              ? 404
              : 500

      return NextResponse.json(
        {
          success: false,
          error: message || "GFチーム編成の確定に失敗しました",
        },
        { status },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("GF team assignment API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
