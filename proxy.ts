import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// 認証が必要なルート
const protectedRoutes: string[] = ["/mypage"]

// 認証済みユーザーがアクセスすべきでないルート
const authRoutes = ["/login"]

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

  return response
}

export const config = {
  matcher: [
    // 静的ファイル、_next、favicon、robots.txt、manifest.json を除外
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
