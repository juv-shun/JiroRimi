import { redirect } from "next/navigation"
import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import { TournamentForm } from "./tournament-form"

export default async function NewTournamentPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader title="大会作成" subtitle="新しい大会を作成します" />
        <TournamentForm mode="create" />
      </div>
    </main>
  )
}
