import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types/profile"
import { ProfileForm } from "./profile-form"

export default async function MyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ミドルウェアで認証チェック済みなので user は必ず存在する
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single()

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* ページヘッダー */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <svg
              className="w-8 h-8 text-primary animate-pulse"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-orange-400 to-amber-500 bg-clip-text text-transparent">
              My Page
            </h1>
            <svg
              className="w-8 h-8 text-primary animate-pulse"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <p className="text-text-secondary text-sm tracking-wide">
            Set up your profile & join the battle!
          </p>
        </div>

        {/* プロフィールフォーム */}
        <ProfileForm profile={profile as Profile} />
      </div>
    </main>
  )
}
