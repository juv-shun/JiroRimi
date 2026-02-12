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
      // ログイン成功後、アバターURLを更新
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const avatarUrl = user.user_metadata?.avatar_url
        const discordUsername =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.user_metadata?.preferred_username

        // アバターURLとユーザー名を更新（既存ユーザーでも最新情報に更新）
        await supabase
          .from("profiles")
          .update({
            avatar_url: avatarUrl ?? null,
            discord_username: discordUsername ?? null,
          })
          .eq("id", user.id)
      }

      // 成功時: / にリダイレクト（1.3.1 で /mypage 実装後に変更可能）
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // エラー時
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
