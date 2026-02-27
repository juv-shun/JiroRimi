import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { TournamentWithEvents, UserEntryInfo } from "@/lib/types/tournament"
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
        rules, gender, status,
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

  let userEntries: UserEntryInfo[] = []
  let userGender: string | null = null
  let isAdmin = false
  if (user) {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("gender, role")
      .eq("id", user.id)
      .single()
    userGender = userProfile?.gender ?? null
    isAdmin = userProfile?.role === "admin"
    const allEventIds = tournaments?.flatMap((t) => t.events.map((e) => e.id)) ?? []
    if (allEventIds.length > 0) {
      const { data: entries, error: entriesError } = await supabase
        .from("entries")
        .select("event_id, checked_in_at")
        .eq("profile_id", user.id)
        .in("event_id", allEventIds)
      if (entriesError) {
        throw entriesError
      }
      // ユーザーの match_participants を検索して in_progress マッチ有無を判定
      const { data: matchParts } = await supabase
        .from("match_participants")
        .select("match_id, matches!inner (event_id, status)")
        .eq("profile_id", user.id)
        .eq("matches.status", "in_progress")
        .in("matches.event_id", allEventIds)
      const matchEventIds = new Set(
        (matchParts ?? []).map((mp) => {
          const match = Array.isArray(mp.matches) ? mp.matches[0] : mp.matches
          return match.event_id as string
        }),
      )
      userEntries = (entries ?? []).map((e) => ({
        ...e,
        hasInProgressMatch: matchEventIds.has(e.event_id),
      }))
    }
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 page-bg-pattern">
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Tournaments" />

        <TournamentList
          tournaments={tournaments as TournamentWithEvents[]}
          isLoggedIn={!!user}
          userEntries={userEntries}
          userGender={userGender}
          isAdmin={isAdmin}
        />
      </div>
    </main>
  )
}
