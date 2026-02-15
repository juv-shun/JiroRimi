import { redirect } from "next/navigation"
import { Fab } from "@/app/components/fab"
import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { TournamentWithEventCount } from "@/lib/types/tournament"
import { TournamentList } from "./tournament-list"

export default async function AdminTournamentsPage() {
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

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id, name, status, created_at, events(count)")
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader title="大会管理" />

        <TournamentList
          tournaments={tournaments as TournamentWithEventCount[]}
        />
      </div>

      <Fab href="/admin/tournaments/new" label="新規大会作成" />
    </main>
  )
}
