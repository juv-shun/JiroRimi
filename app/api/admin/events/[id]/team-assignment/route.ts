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
        team_a_profile_ids: z.array(z.string().uuid()).length(5),
        team_b_profile_ids: z.array(z.string().uuid()).length(5),
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

    // 6a. イベントの存在確認
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

    // 6b. イベントの status が in_progress か
    if (event.status !== "in_progress") {
      return NextResponse.json(
        { success: false, error: "イベントが進行中ではありません" },
        { status: 409 },
      )
    }

    // 7. round_number 算出 & 同一ラウンド重複チェック
    const { data: maxRoundData, error: maxRoundError } = await supabase
      .from("matches")
      .select("round_number")
      .eq("event_id", id)
      .order("round_number", { ascending: false })
      .limit(1)

    if (maxRoundError) {
      console.error("Max round fetch error:", maxRoundError)
      return NextResponse.json(
        { success: false, error: "ラウンド情報の取得に失敗しました" },
        { status: 500 },
      )
    }

    const currentMax =
      maxRoundData && maxRoundData.length > 0
        ? maxRoundData[0].round_number
        : 0
    const nextRound = currentMax + 1

    // 7b. 同一ラウンドに既にマッチが存在しないか確認（二重送信防止）
    const { count: existingMatchCount, error: existingMatchError } =
      await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("round_number", nextRound)

    if (existingMatchError) {
      console.error("Existing match check error:", existingMatchError)
      return NextResponse.json(
        { success: false, error: "ラウンド情報の確認に失敗しました" },
        { status: 500 },
      )
    }

    if (existingMatchCount && existingMatchCount > 0) {
      return NextResponse.json(
        { success: false, error: "このラウンドは既に編成済みです" },
        { status: 409 },
      )
    }

    // 8. チェックイン済み参加者の profile_id セットとリクエストの一致確認
    const { data: checkedInEntries, error: entriesError } = await supabase
      .from("entries")
      .select("profile_id")
      .eq("event_id", id)
      .not("checked_in_at", "is", null)

    if (entriesError) {
      console.error("Entries fetch error:", entriesError)
      return NextResponse.json(
        { success: false, error: "エントリーの取得に失敗しました" },
        { status: 500 },
      )
    }

    const checkedInProfileIds = new Set(
      (checkedInEntries ?? []).map((e) => e.profile_id),
    )
    const requestProfileIds = new Set(allProfileIds)

    if (checkedInProfileIds.size !== requestProfileIds.size) {
      return NextResponse.json(
        { success: false, error: "参加者リストが一致しません" },
        { status: 400 },
      )
    }
    for (const pid of requestProfileIds) {
      if (!checkedInProfileIds.has(pid)) {
        return NextResponse.json(
          { success: false, error: "参加者リストが一致しません" },
          { status: 400 },
        )
      }
    }

    // DB操作: matches + match_participants を作成
    // 部分書き込み防止: エラー時は作成済みマッチをクリーンアップ
    const createdMatchIds: string[] = []

    try {
      for (const match of parsed.data.matches) {
        const { data: insertedMatch, error: matchError } = await supabase
          .from("matches")
          .insert({
            event_id: id,
            round_number: nextRound,
            status: "waiting",
          })
          .select("id")
          .single()

        if (matchError || !insertedMatch) {
          console.error("Match insert error:", matchError)
          throw new Error("マッチの作成に失敗しました")
        }

        createdMatchIds.push(insertedMatch.id)

        const participants = [
          ...match.team_a_profile_ids.map((profileId) => ({
            match_id: insertedMatch.id,
            profile_id: profileId,
            team: "team_a" as const,
          })),
          ...match.team_b_profile_ids.map((profileId) => ({
            match_id: insertedMatch.id,
            profile_id: profileId,
            team: "team_b" as const,
          })),
        ]

        const { error: participantsError } = await supabase
          .from("match_participants")
          .insert(participants)

        if (participantsError) {
          console.error("Match participants insert error:", participantsError)
          throw new Error("参加者の登録に失敗しました")
        }
      }
    } catch (insertError) {
      // クリーンアップ: 作成済みマッチを削除（CASCADE で match_participants も削除される）
      if (createdMatchIds.length > 0) {
        const { error: cleanupError } = await supabase
          .from("matches")
          .delete()
          .in("id", createdMatchIds)

        if (cleanupError) {
          console.error("Cleanup error:", cleanupError)
        }
      }

      const message =
        insertError instanceof Error
          ? insertError.message
          : "マッチの作成に失敗しました"
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 },
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
