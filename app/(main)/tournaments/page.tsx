import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { TournamentWithEventCount } from "@/lib/types/tournament"
import { TournamentList } from "./tournament-list"

export default async function TournamentsPage() {
  const supabase = await createClient()

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
        <PageHeader title="大会一覧" />

        <TournamentList
          tournaments={tournaments as TournamentWithEventCount[]}
        />
      </div>
    </main>
  )
}
