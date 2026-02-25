import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ id: string }>
}

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

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

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const auth = await authorize(supabase)
    if (auth.error) return auth.error

    const { count, error: updateError } = await supabase
      .from("entries")
      .update(
        { checked_in_at: new Date().toISOString() },
        { count: "exact" },
      )
      .eq("id", id)

    if (updateError) {
      console.error("Admin checkin update error:", updateError)
      return NextResponse.json(
        { success: false, error: "チェックインに失敗しました" },
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
    console.error("Admin checkin API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const auth = await authorize(supabase)
    if (auth.error) return auth.error

    const { count, error: updateError } = await supabase
      .from("entries")
      .update(
        { checked_in_at: null },
        { count: "exact" },
      )
      .eq("id", id)

    if (updateError) {
      console.error("Admin checkin delete error:", updateError)
      return NextResponse.json(
        { success: false, error: "チェックイン取り消しに失敗しました" },
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
    console.error("Admin checkin delete API error:", e)
    return NextResponse.json(
      { success: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
