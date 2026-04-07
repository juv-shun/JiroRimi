import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types/profile"
import { isProfileComplete } from "@/lib/utils/profile"
import { ProfileForm } from "./profile-form"

export default async function MyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // proxyで認証チェック済みなので user は必ず存在する
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single()

  const isFirstTimeSetup = !isProfileComplete(profile as Profile | null)

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 page-bg-pattern">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="My Page"
          subtitle={
            isFirstTimeSetup
              ? "Complete your profile to join tournaments!"
              : "Set up your profile & join the battle!"
          }
        />

        {isFirstTimeSetup && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/10 p-4 shadow-[0_16px_32px_rgba(0,0,0,0.18)]">
            <h2 className="text-lg font-semibold text-[#ffd7dc]">Welcome!</h2>
            <p className="mt-1 text-sm text-text-secondary">
              プロフィールを完成させてください。
            </p>
          </div>
        )}

        {/* プロフィールフォーム */}
        <ProfileForm
          profile={profile as Profile | null}
          isFirstTimeSetup={isFirstTimeSetup}
        />
      </div>
    </main>
  )
}
