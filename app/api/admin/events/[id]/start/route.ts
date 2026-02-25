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
  excluded_entry_ids: z.array(z.string().uuid()),
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { success: false, error: "イベントIDの形式が不正です" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const auth = await authorize(supabase)
    if (auth.error) return auth.error

    // リクエストボディのパース・バリデーション
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

    // 重複排除
    const uniqueExcludedIds = [...new Set(parsed.data.excluded_entry_ids)]

    // チェックイン済みエントリーを取得
    const { data: checkedInEntries, error: entriesError } = await supabase
      .from("entries")
      .select("id")
      .eq("event_id", id)
      .not("checked_in_at", "is", null)

    if (entriesError) {
      console.error("Entries fetch error:", entriesError)
      return NextResponse.json(
        { success: false, error: "エントリーの取得に失敗しました" },
        { status: 500 },
      )
    }

    const checkedInIds = new Set((checkedInEntries ?? []).map((e) => e.id))

    // 除外対象がチェックイン済みエントリーに含まれることを検証
    for (const excludedId of uniqueExcludedIds) {
      if (!checkedInIds.has(excludedId)) {
        return NextResponse.json(
          { success: false, error: "無効な除外対象が含まれています" },
          { status: 400 },
        )
      }
    }

    // 参加人数のバリデーション
    const participantCount = checkedInIds.size - uniqueExcludedIds.length

    if (participantCount < 10) {
      return NextResponse.json(
        { success: false, error: "参加人数が10人未満です" },
        { status: 400 },
      )
    }

    if (participantCount % 10 !== 0) {
      return NextResponse.json(
        { success: false, error: "参加人数が10の倍数ではありません" },
        { status: 400 },
      )
    }

    // 原子的ステータス更新（先に実行）
    const { count, error: updateError } = await supabase
      .from("events")
      .update(
        { status: "in_progress" },
        { count: "exact" },
      )
      .eq("id", id)
      .eq("status", "scheduled")

    if (updateError) {
      console.error("Event status update error:", updateError)
      return NextResponse.json(
        { success: false, error: "イベントの更新に失敗しました" },
        { status: 500 },
      )
    }

    if (!count) {
      // 原因判別: イベントが存在しないか、既に開始済みか
      const { data: existingEvent } = await supabase
        .from("events")
        .select("status")
        .eq("id", id)
        .single()

      if (!existingEvent) {
        return NextResponse.json(
          { success: false, error: "イベントが見つかりません" },
          { status: 404 },
        )
      }

      return NextResponse.json(
        { success: false, error: "イベントは既に開始されています" },
        { status: 409 },
      )
    }

    // 除外対象の checked_in_at を NULL に更新
    if (uniqueExcludedIds.length > 0) {
      const { error: excludeError } = await supabase
        .from("entries")
        .update({ checked_in_at: null })
        .eq("event_id", id)
        .in("id", uniqueExcludedIds)

      if (excludeError) {
        console.error(
          "Exclude entries error (event already in_progress):",
          excludeError,
        )
        return NextResponse.json(
          {
            success: false,
            error:
              "イベントは開始されましたが、除外処理に失敗しました。手動で対応してください",
          },
          { status: 500 },
        )
      }
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Event start API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
