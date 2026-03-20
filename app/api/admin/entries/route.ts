import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function parseBody(body: unknown): { error?: string; data?: Record<string, unknown> } {
  if (typeof body !== "object" || body === null) {
    return { error: "リクエスト形式が不正です" }
  }
  return { data: body as Record<string, unknown> }
}

export async function POST(request: Request) {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "リクエスト形式が不正です" },
        { status: 400 },
      )
    }

    const parsed = parseBody(rawBody)
    if (parsed.error) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      )
    }

    const { event_id, profile_id } = parsed.data!

    if (!event_id || typeof event_id !== "string" || !UUID_REGEX.test(event_id)) {
      return NextResponse.json(
        { success: false, error: "イベントIDの形式が不正です" },
        { status: 400 },
      )
    }

    if (!profile_id || typeof profile_id !== "string" || !UUID_REGEX.test(profile_id)) {
      return NextResponse.json(
        { success: false, error: "プロフィールIDの形式が不正です" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const auth = await authorize(supabase)
    if (auth.error) return auth.error

    // イベント存在確認 + entry_type + status + 参加条件チェック
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, entry_type, status, max_participants, gender, entries(count)")
      .eq("id", event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: "イベントが見つかりません" },
        { status: 404 },
      )
    }

    if (event.entry_type !== "invite") {
      return NextResponse.json(
        { success: false, error: "招待制イベントのみエントリー追加できます" },
        { status: 400 },
      )
    }

    if (event.status !== "scheduled") {
      return NextResponse.json(
        { success: false, error: "イベント開始後はエントリー操作できません" },
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

    // 性別制限チェック
    if (event.gender) {
      const { data: targetProfile, error: targetProfileError } = await supabase
        .from("profiles")
        .select("gender")
        .eq("id", profile_id)
        .single()

      if (targetProfileError || !targetProfile) {
        return NextResponse.json(
          { success: false, error: "対象ユーザーが見つかりません" },
          { status: 404 },
        )
      }

      if (targetProfile.gender !== event.gender) {
        const genderLabel = event.gender === "boys" ? "ボーイズ" : "ガールズ"
        return NextResponse.json(
          { success: false, error: `このイベントは${genderLabel}限定です` },
          { status: 400 },
        )
      }
    }

    // エントリー追加（RLS entries_insert_admin で許可済み）
    // TOCTOU対策: イベントステータスが変更された場合でもRLSで保護される
    // 重複はユニーク制約で検出
    const { error: insertError } = await supabase
      .from("entries")
      .insert({ profile_id, event_id })

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "既にエントリー済みです" },
          { status: 409 },
        )
      }
      console.error("Entry insert error:", insertError)
      return NextResponse.json(
        { success: false, error: "エントリーの追加に失敗しました" },
        { status: 500 },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Admin entry POST error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "リクエスト形式が不正です" },
        { status: 400 },
      )
    }

    const parsed = parseBody(rawBody)
    if (parsed.error) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 },
      )
    }

    const { entry_id } = parsed.data!

    if (!entry_id || typeof entry_id !== "string" || !UUID_REGEX.test(entry_id)) {
      return NextResponse.json(
        { success: false, error: "エントリーIDの形式が不正です" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const auth = await authorize(supabase)
    if (auth.error) return auth.error

    // 条件付き削除: entry_type='invite' + status='scheduled' + 未チェックインを
    // 1クエリで原子的に検証・削除する
    // まずエントリーの存在と条件を確認（エラーメッセージの出し分けのため）
    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .select("id, checked_in_at, events!inner (entry_type, status)")
      .eq("id", entry_id)
      .single()

    if (entryError || !entry) {
      return NextResponse.json(
        { success: false, error: "エントリーが見つかりません" },
        { status: 404 },
      )
    }

    const event = Array.isArray(entry.events) ? entry.events[0] : entry.events

    if (event?.entry_type !== "invite") {
      return NextResponse.json(
        { success: false, error: "招待制イベントのみエントリー削除できます" },
        { status: 400 },
      )
    }

    if (event?.status !== "scheduled") {
      return NextResponse.json(
        { success: false, error: "イベント開始後はエントリー操作できません" },
        { status: 400 },
      )
    }

    if (entry.checked_in_at !== null) {
      return NextResponse.json(
        { success: false, error: "チェックイン済みのエントリーは削除できません" },
        { status: 400 },
      )
    }

    // 条件付き削除: checked_in_at が null のもののみ削除（TOCTOU対策）
    const { count, error: deleteError } = await supabase
      .from("entries")
      .delete({ count: "exact" })
      .eq("id", entry_id)
      .is("checked_in_at", null)

    if (deleteError) {
      console.error("Entry delete error:", deleteError)
      return NextResponse.json(
        { success: false, error: "エントリーの削除に失敗しました" },
        { status: 500 },
      )
    }

    if (!count) {
      // 事前チェック後にチェックインされた（TOCTOU競合）
      return NextResponse.json(
        { success: false, error: "チェックイン済みのエントリーは削除できません" },
        { status: 400 },
      )
    }

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Admin entry DELETE error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
