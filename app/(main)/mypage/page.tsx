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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">マイページ</h1>
          <p className="mt-1 text-sm text-text-secondary">
            プロフィール情報を設定してください
          </p>
        </div>

        {/* プロフィールフォーム */}
        <ProfileForm profile={profile as Profile} />
      </div>
    </main>
  )
}
