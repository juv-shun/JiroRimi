import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { RawBracketMatch, TeamInfo } from "@/lib/types/bracket"

import { BracketView } from "./bracket-view"

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
    .select("id, name, seed")
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
          teams={(teams ?? []) as TeamInfo[]}
          eventId={eid}
        />
      </div>
    </main>
  )
}
