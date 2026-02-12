import { Sidebar } from "@/app/components/sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // プロフィールからユーザー名を取得
  let userName: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("player_name")
      .eq("id", user.id)
      .single()
    userName = profile?.player_name ?? user.email?.split("@")[0]
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isLoggedIn={!!user} userName={userName} />
      {/* Main Content */}
      <main className="pt-14 md:ml-64 md:pt-0">{children}</main>
    </div>
  )
}
