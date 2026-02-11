import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LoginButton } from "./login-button"

type SearchParams = Promise<{ error?: string }>

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ログイン済みの場合はリダイレクト
  if (user) {
    redirect("/")
  }

  const params = await searchParams
  const error = params.error

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-8">じろりみ</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-error rounded-lg text-sm">
            {error === "access_denied" && "ログインがキャンセルされました"}
            {error === "auth_failed" &&
              "ログインに失敗しました。もう一度お試しください"}
          </div>
        )}

        <LoginButton />
      </div>
    </main>
  )
}
