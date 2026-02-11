import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  // ユーザーが認可をキャンセルした場合
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=access_denied`)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      // 成功時: / にリダイレクト（1.3.1 で /mypage 実装後に変更可能）
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // エラー時
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
