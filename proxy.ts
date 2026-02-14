import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// 認証が必要なルート
const protectedRoutes: string[] = ["/mypage", "/admin"]

// 認証済みユーザーがアクセスすべきでないルート
const authRoutes = ["/login"]

// プロフィール未完了時に許可するルート
const firstTimeSetupAllowedRoutes = ["/mypage", "/auth/callback", "/api/profile"]

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // 保護ルートへの未認証アクセス → /login へリダイレクト
  if (!user && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // ログイン済みユーザーが /login にアクセス → / へリダイレクト
  if (user && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // 初回登録モード: ログイン済み＋許可ルート以外 → プロフィール完了チェック
  if (
    user &&
    !firstTimeSetupAllowedRoutes.some((route) => pathname.startsWith(route))
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {}, // proxyではcookie書き込み不要
        },
      },
    )

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "player_name, x_id, gender, first_role, second_role, third_role, role",
      )
      .eq("id", user.id)
      .single()

    // admin権限チェック: /admin パスへのアクセスは admin ロールのみ許可
    const isAdminRoute = pathname.startsWith("/admin")
    if (isAdminRoute && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/forbidden", request.url))
    }

    // 完了判定: profileがnullまたは必須フィールドが未入力なら未完了
    const isComplete =
      profile?.player_name &&
      profile.player_name.trim() !== "" &&
      profile.x_id &&
      profile.x_id !== "PENDING" &&
      profile.x_id.trim() !== "" &&
      profile.gender &&
      profile.first_role &&
      profile.second_role &&
      profile.third_role &&
      new Set([profile.first_role, profile.second_role, profile.third_role])
        .size === 3

    if (!isComplete && !isAdminRoute) {
      return NextResponse.redirect(new URL("/mypage", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    // 静的ファイル、_next、favicon、robots.txt、manifest.json を除外
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
