import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { TournamentWithEvents } from "@/lib/types/tournament"
import { TournamentList } from "./tournament-list"

export default async function TournamentsPage() {
  const supabase = await createClient()

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select(`
      id, name, status, created_at,
      events (
        id, event_number, name, entry_type, match_format,
        matches_per_event, max_participants, scheduled_date,
        entry_start, entry_end, checkin_start, checkin_end,
        rules,
        entries (count)
      )
    `)
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .order("event_number", { referencedTable: "events", ascending: true })

  if (error) {
    throw error
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userEntries: string[] = []
  if (user) {
    const allEventIds = tournaments?.flatMap((t) => t.events.map((e) => e.id)) ?? []
    if (allEventIds.length > 0) {
      const { data: entries, error: entriesError } = await supabase
        .from("entries")
        .select("event_id")
        .eq("profile_id", user.id)
        .in("event_id", allEventIds)
      if (entriesError) {
        throw entriesError
      }
      userEntries = entries?.map((e) => e.event_id) ?? []
    }
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Tournaments" />

        <TournamentList
          tournaments={tournaments as TournamentWithEvents[]}
          isLoggedIn={!!user}
          userEntries={userEntries}
        />
      </div>
    </main>
  )
}
