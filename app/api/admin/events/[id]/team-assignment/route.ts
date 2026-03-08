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
  matches: z
    .array(
      z.object({
        team_a_profile_ids: z.array(z.string().regex(UUID_REGEX)).length(5),
        team_b_profile_ids: z.array(z.string().regex(UUID_REGEX)).length(5),
      }),
    )
    .min(1),
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

    // 2-3. 認証・admin権限チェック
    const auth = await authorize(supabase)
    if (auth.error) return auth.error

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

    // 5. profile_id 重複チェック
    const allProfileIds = parsed.data.matches.flatMap((m) => [
      ...m.team_a_profile_ids,
      ...m.team_b_profile_ids,
    ])
    if (new Set(allProfileIds).size !== allProfileIds.length) {
      return NextResponse.json(
        { success: false, error: "参加者の重複があります" },
        { status: 400 },
      )
    }

    // 6. イベントの存在確認
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

    const { error: rpcError } = await supabase.rpc(
      "create_round_matches_and_start",
      {
        p_event_id: id,
        p_matches: parsed.data.matches,
      },
    )

    if (rpcError) {
      console.error("Team assignment transaction error:", rpcError)

      const message = rpcError.message
      const status =
        message === "このラウンドは既に編成済みです" ||
        message === "イベントが進行中ではありません"
          ? 409
          : message === "参加者の重複があります" ||
              message === "参加者リストが一致しません" ||
              message === "リクエスト形式が不正です"
            ? 400
            : message === "イベントが見つかりません"
              ? 404
              : 500

      return NextResponse.json(
        { success: false, error: message || "チーム編成の確定に失敗しました" },
        { status },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Team assignment API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
