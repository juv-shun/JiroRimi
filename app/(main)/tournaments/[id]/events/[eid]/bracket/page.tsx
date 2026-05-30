import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type {
  RawBracketMatch,
  TeamInfo,
  TeamMemberInfo,
} from "@/lib/types/bracket"

import { BracketView } from "./bracket-view"

type TeamMemberRow = {
  profile_id: string
  profiles:
    | {
        player_name: string | null
        avatar_url: string | null
        first_role: string | null
        second_role: string | null
        third_role: string | null
      }
    | {
        player_name: string | null
        avatar_url: string | null
        first_role: string | null
        second_role: string | null
        third_role: string | null
      }[]
    | null
}

function mapTeamMembers(members: TeamMemberRow[] | null): TeamMemberInfo[] {
  return (members ?? []).map((member) => {
    const profile = Array.isArray(member.profiles)
      ? (member.profiles[0] ?? null)
      : member.profiles

    return {
      profileId: member.profile_id,
      playerName: profile?.player_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      firstRole: profile?.first_role ?? null,
      secondRole: profile?.second_role ?? null,
      thirdRole: profile?.third_role ?? null,
    }
  })
}

export default async function BracketPage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>
}) {
  const { id, eid } = await params
  const supabase = await createClient()

  // イベント + 大会名の検証
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, match_format, tournaments!inner(id, name)")
    .eq("id", eid)
    .eq("tournament_id", id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  if (event.match_format !== "double_elimination") {
    notFound()
  }

  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

  // bracket_matches 取得
  const { data: bracketMatches, error: bracketError } = await supabase
    .from("bracket_matches")
    .select(
      "id, bracket_type, round_number, match_order, team_a_id, team_b_id, winner_team_id, status",
    )
    .eq("event_id", eid)
    .order("round_number")
    .order("match_order")

  if (bracketError) {
    notFound()
  }

  // tournament_teams 取得
  const { data: teams, error: teamsError } = await supabase
    .from("tournament_teams")
    .select(
      `
      id, name, seed,
      tournament_team_members (
        profile_id,
        profiles (player_name, avatar_url, first_role, second_role, third_role)
      )
    `,
    )
    .eq("event_id", eid)
    .order("seed")

  if (teamsError) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 page-bg-pattern">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          大会一覧に戻る
        </Link>

        <PageHeader
          title={tournament.name}
          subtitle={`${event.name} - トーナメント表`}
        />

        <BracketView
          initialBracketMatches={(bracketMatches ?? []) as RawBracketMatch[]}
          teams={
            (teams ?? []).map((team) => ({
              id: team.id,
              name: team.name,
              seed: team.seed,
              members: mapTeamMembers(
                team.tournament_team_members as TeamMemberRow[] | null,
              ),
            })) satisfies TeamInfo[]
          }
          eventId={eid}
        />
      </div>
    </main>
  )
}
