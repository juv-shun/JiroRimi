import { Sidebar } from "@/app/components/sidebar"
import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types/profile"
import { isProfileComplete } from "@/lib/utils/profile"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // プロフィールからユーザー名と完了状態を取得
  let userName: string | undefined
  let isFirstTimeSetup = false
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
    userName = profile?.player_name ?? user.email?.split("@")[0]
    isFirstTimeSetup = !isProfileComplete(profile as Profile | null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isLoggedIn={!!user}
        userName={userName}
        isFirstTimeSetup={isFirstTimeSetup}
      />
      {/* Main Content */}
      <main className="pt-14 md:ml-64 md:pt-0">{children}</main>
    </div>
  )
}
