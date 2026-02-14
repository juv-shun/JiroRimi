import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { LogoutButton } from "./logout-button"

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="bg-white border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-primary">
          Jiro-Rimi Cup
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/mypage"
                className="text-text-secondary hover:text-primary font-medium transition-colors"
              >
                マイページ
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="bg-primary hover:bg-primary-hover text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
