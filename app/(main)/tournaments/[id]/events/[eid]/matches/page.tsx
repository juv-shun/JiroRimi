import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type {
  MatchForDisplay,
  MatchParticipantForDisplay,
  MatchResult,
  MatchStatus,
  Team,
  Vote,
} from "@/lib/types/match"
import type { Role } from "@/lib/types/profile"
import { MatchPage } from "./match-page"

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>
}) {
  const { id, eid } = await params
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // イベント情報取得（tournament_id との整合性チェック含む）
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, tournament_id, name, scheduled_date, tournaments!inner (id, name)",
    )
    .eq("id", eid)
    .eq("tournament_id", id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  // ユーザーの match_participants を取得（RLS で未開始マッチは公開されない）
  const { data: myParticipations, error: myError } = await supabase
    .from("match_participants")
    .select(
      "profile_id, match_id, team, vote, matches!inner (id, event_id, round_number, lobby_number, status, result)",
    )
    .eq("profile_id", user.id)
    .eq("matches.event_id", eid)

  if (myError) {
    throw myError
  }

  // 参加マッチが0件 → リダイレクト
  if (!myParticipations || myParticipations.length === 0) {
    redirect("/tournaments")
  }

  // 参加マッチIDリスト
  const matchIds = myParticipations.map((mp) => {
    const match = Array.isArray(mp.matches) ? mp.matches[0] : mp.matches
    return match.id as string
  })

  // 全参加者情報を取得
  const { data: allParticipants, error: allError } = await supabase
    .from("match_participants")
    .select(
      "match_id, profile_id, team, vote, profiles (player_name, avatar_url, first_role, second_role, third_role)",
    )
    .in("match_id", matchIds)
    .order("team", { ascending: true })

  if (allError) {
    throw allError
  }

  // MatchForDisplay[] に整形
  const matchMap = new Map<string, MatchForDisplay>()

  for (const mp of myParticipations) {
    const match = Array.isArray(mp.matches) ? mp.matches[0] : mp.matches
    const matchId = match.id as string
    const participants = (allParticipants ?? []).filter(
      (p) => p.match_id === matchId,
    )

    const teamA: MatchParticipantForDisplay[] = []
    const teamB: MatchParticipantForDisplay[] = []

    for (const p of participants) {
      const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles

      const participant: MatchParticipantForDisplay = {
        profileId: p.profile_id,
        playerName: profile?.player_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        firstRole: (profile?.first_role as Role | null) ?? null,
        secondRole: (profile?.second_role as Role | null) ?? null,
        thirdRole: (profile?.third_role as Role | null) ?? null,
        team: p.team as Team,
        vote: p.vote as Vote | null,
      }

      if (p.team === "team_a") {
        teamA.push(participant)
      } else {
        teamB.push(participant)
      }
    }

    // チーム内をプレイヤー名でソート
    const sortByName = (
      a: MatchParticipantForDisplay,
      b: MatchParticipantForDisplay,
    ) => (a.playerName ?? "").localeCompare(b.playerName ?? "")
    teamA.sort(sortByName)
    teamB.sort(sortByName)

    matchMap.set(matchId, {
      matchId,
      roundNumber: match.round_number as number,
      lobbyNumber: match.lobby_number as string | null,
      status: match.status as MatchStatus,
      result: match.result as MatchResult,
      myTeam: mp.team as Team,
      teamA,
      teamB,
      myVote: mp.vote as Vote | null,
    })
  }

  const matches = Array.from(matchMap.values()).sort(
    (a, b) => a.roundNumber - b.roundNumber,
  )

  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 page-bg-pattern">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          大会一覧に戻る
        </Link>

        <PageHeader
          title={tournament.name}
          subtitle={`${event.name} - 試合情報`}
        />

        <MatchPage matches={matches} eventId={eid} />
      </div>
    </main>
  )
}
