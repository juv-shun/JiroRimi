import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type {
  TournamentWithEvents,
  UserEntryInfo,
} from "@/lib/types/tournament"
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

  const tournamentList = (tournaments ?? []) as TournamentWithEvents[]

  // 開始済み/完了イベントの参加者数（チェックイン済み）を取得
  const startedEventIds = tournamentList
    .flatMap((t) => t.events)
    .filter((e) => e.status === "in_progress" || e.status === "completed")
    .map((e) => e.id)

  if (startedEventIds.length > 0) {
    const { data: checkedInCounts } = await supabase
      .from("entries")
      .select("event_id")
      .in("event_id", startedEventIds)
      .not("checked_in_at", "is", null)

    const countMap = new Map<string, number>()
    for (const row of checkedInCounts ?? []) {
      countMap.set(row.event_id, (countMap.get(row.event_id) ?? 0) + 1)
    }
    for (const t of tournamentList) {
      for (const e of t.events) {
        if (countMap.has(e.id)) {
          e.participantCount = countMap.get(e.id)
        }
      }
    }
  }

  // GFイベントのチーム編成済みフラグ取得
  const gfEventIds = tournamentList
    .flatMap((t) => t.events)
    .filter((e) => e.match_format === "double_elimination")
    .map((e) => e.id)

  if (gfEventIds.length > 0) {
    const { data: teamCounts } = await supabase
      .from("tournament_teams")
      .select("event_id")
      .in("event_id", gfEventIds)

    const teamEventIds = new Set(
      (teamCounts ?? []).map((row) => row.event_id as string),
    )
    // bracket_matches 存在確認
    const { data: bracketRows } = await supabase
      .from("bracket_matches")
      .select("event_id")
      .in("event_id", gfEventIds)

    const bracketEventIds = new Set(
      (bracketRows ?? []).map((row) => row.event_id as string),
    )

    for (const t of tournamentList) {
      for (const e of t.events) {
        if (e.match_format === "double_elimination") {
          e.teamAssigned = teamEventIds.has(e.id)
          e.bracketExists = bracketEventIds.has(e.id)
        }
      }
    }
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
    const allEventIds = tournamentList.flatMap((t) => t.events.map((e) => e.id))
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

      // GF は entries ではなく tournament_team_members 所属を参加判定に使う
      const { data: gfMemberships } = await supabase
        .from("tournament_team_members")
        .select("team_id, tournament_teams!inner (event_id)")
        .eq("profile_id", user.id)
        .in("tournament_teams.event_id", allEventIds)

      const gfTeamIds = new Set<string>()
      const gfMemberEventIds = new Set<string>()
      for (const membership of gfMemberships ?? []) {
        gfTeamIds.add(membership.team_id as string)
        const team = Array.isArray(membership.tournament_teams)
          ? membership.tournament_teams[0]
          : membership.tournament_teams
        if (team?.event_id) {
          gfMemberEventIds.add(team.event_id as string)
        }
      }

      if (gfMemberEventIds.size > 0) {
        const { data: activeBracketMatches } = await supabase
          .from("bracket_matches")
          .select("event_id, team_a_id, team_b_id, status")
          .in("event_id", Array.from(gfMemberEventIds))
          .in("status", ["ready", "in_progress"])

        for (const match of activeBracketMatches ?? []) {
          const teamAId = match.team_a_id as string | null
          const teamBId = match.team_b_id as string | null
          if (
            (teamAId && gfTeamIds.has(teamAId)) ||
            (teamBId && gfTeamIds.has(teamBId))
          ) {
            matchEventIds.add(match.event_id as string)
          }
        }
      }

      const entryMap = new Map<string, UserEntryInfo>()
      for (const entry of entries ?? []) {
        entryMap.set(entry.event_id, {
          ...entry,
          hasInProgressMatch: matchEventIds.has(entry.event_id),
        })
      }

      for (const eventId of gfMemberEventIds) {
        if (!entryMap.has(eventId)) {
          entryMap.set(eventId, {
            event_id: eventId,
            checked_in_at: null,
            hasInProgressMatch: matchEventIds.has(eventId),
          })
        }
      }

      userEntries = Array.from(entryMap.values())
    }
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 page-bg-pattern">
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Tournaments" subtitle="Official Entry Console" />

        <TournamentList
          tournaments={tournamentList}
          isLoggedIn={!!user}
          userEntries={userEntries}
          userGender={userGender}
          isAdmin={isAdmin}
        />
      </div>
    </main>
  )
}
