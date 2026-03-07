import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft, Calendar, Swords } from "lucide-react"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type {
  AdminMatchForDisplay,
  AdminMatchParticipant,
  ExistingMatchInfo,
  ExistingRound,
  MatchResult,
  MatchStatus,
  ParticipantInfo,
  Team,
  Vote,
} from "@/lib/types/match"
import type { Role } from "@/lib/types/profile"
import { formatDateJST } from "@/lib/utils/datetime"
import { computeStandings } from "@/lib/utils/match-result"
import { RoundManager } from "./round-manager"

export default async function AdminMatchesPage({
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

  // admin権限チェック
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    redirect("/")
  }

  // イベント + 大会名
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, name, scheduled_date, status, matches_per_event, tournaments!inner(id, name)",
    )
    .eq("id", eid)
    .eq("tournament_id", id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  if (event.status !== "in_progress") {
    redirect(`/admin/tournaments/${id}/edit`)
  }

  // チェックイン済みエントリー取得（profiles JOIN）
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select(
      "profile_id, profiles (id, player_name, avatar_url, first_role, second_role, third_role)",
    )
    .eq("event_id", eid)
    .not("checked_in_at", "is", null)
    .order("created_at", { ascending: true })

  if (entriesError) {
    notFound()
  }

  const participants: ParticipantInfo[] = (entries ?? []).map((entry) => {
    const p = Array.isArray(entry.profiles)
      ? entry.profiles[0]
      : entry.profiles
    return {
      profileId: entry.profile_id,
      playerName: p?.player_name ?? null,
      avatarUrl: p?.avatar_url ?? null,
      firstRole: (p?.first_role as Role) ?? null,
      secondRole: (p?.second_role as Role) ?? null,
      thirdRole: (p?.third_role as Role) ?? null,
    }
  })

  // マッチ + 参加者（ロール情報含む）
  const { data: allMatches, error: matchError } = await supabase
    .from("matches")
    .select(
      `
      id,
      round_number,
      lobby_number,
      status,
      result,
      match_participants (
        id,
        profile_id,
        team,
        vote,
        profiles (player_name, avatar_url, first_role, second_role, third_role)
      )
    `,
    )
    .eq("event_id", eid)
    .order("round_number")
    .order("created_at")

  if (matchError) {
    notFound()
  }

  // AdminMatchForDisplay[] に変換
  const matchList: AdminMatchForDisplay[] = (allMatches ?? []).map((m) => {
    const matchParticipants = (m.match_participants ?? []).map((mp) => {
      const prof = Array.isArray(mp.profiles) ? mp.profiles[0] : mp.profiles
      return {
        profileId: mp.profile_id,
        playerName: prof?.player_name ?? null,
        avatarUrl: prof?.avatar_url ?? null,
        firstRole: (prof?.first_role as Role) ?? null,
        team: mp.team as Team,
        vote: mp.vote as Vote | null,
      } satisfies AdminMatchParticipant
    })

    return {
      matchId: m.id,
      roundNumber: m.round_number,
      lobbyNumber: m.lobby_number,
      status: m.status as MatchStatus,
      result: m.result as MatchResult,
      teamA: matchParticipants.filter((p) => p.team === "team_a"),
      teamB: matchParticipants.filter((p) => p.team === "team_b"),
    }
  })

  // ExistingRound[] に変換（チーム編成用: ロール情報含む）
  const existingRounds: ExistingRound[] = (() => {
    if (!allMatches || allMatches.length === 0) return []

    const roundMap = new Map<number, ExistingMatchInfo[]>()
    for (const m of allMatches) {
      const matchInfo: ExistingMatchInfo = {
        matchId: m.id,
        teamA: [],
        teamB: [],
      }
      for (const mp of m.match_participants ?? []) {
        const prof = Array.isArray(mp.profiles)
          ? mp.profiles[0]
          : mp.profiles
        const participant: ParticipantInfo = {
          profileId: mp.profile_id,
          playerName: prof?.player_name ?? null,
          avatarUrl: prof?.avatar_url ?? null,
          firstRole: (prof?.first_role as Role) ?? null,
          secondRole: (prof?.second_role as Role) ?? null,
          thirdRole: (prof?.third_role as Role) ?? null,
        }
        if (mp.team === "team_a") {
          matchInfo.teamA.push(participant)
        } else {
          matchInfo.teamB.push(participant)
        }
      }
      const arr = roundMap.get(m.round_number) ?? []
      arr.push(matchInfo)
      roundMap.set(m.round_number, arr)
    }

    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, matches]) => ({ roundNumber, matches }))
  })()

  // 成績算出
  const standings = computeStandings(matchList)
  const standingsMap: Record<string, { wins: number; losses: number }> = {}
  for (const s of standings) {
    standingsMap[s.profileId] = { wins: s.wins, losses: s.losses }
  }

  // 次ラウンド番号算出
  const roundNumbers = [...new Set(matchList.map((m) => m.roundNumber))].sort((a, b) => a - b)
  const currentMax = roundNumbers.length > 0 ? roundNumbers[roundNumbers.length - 1] : 0
  const nextRoundNumber = currentMax + 1
  const matchCount = participants.length / 10

  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

  // ラウンド進行状況
  const confirmedRounds = roundNumbers.filter((rn) =>
    matchList
      .filter((m) => m.roundNumber === rn)
      .every((m) => m.status === "confirmed"),
  )

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href={`/admin/tournaments/${id}/edit`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          大会編集に戻る
        </Link>

        <PageHeader
          title={tournament.name}
          subtitle={`${event.name} - 試合管理`}
        />

        {/* サマリーカード */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">開催日</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDateJST(event.scheduled_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Swords className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">ラウンド進行</p>
                <p className="text-sm font-medium text-gray-900">
                  {confirmedRounds.length}/{event.matches_per_event} 完了
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Swords className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">マッチ作成済み</p>
                <p className="text-sm font-medium text-gray-900">
                  {roundNumbers.length} ラウンド
                </p>
              </div>
            </div>
          </div>
        </div>

        <RoundManager
          matches={matchList}
          totalRounds={event.matches_per_event}
          eventId={eid}
          tournamentId={id}
          eventStatus={event.status}
          participants={participants}
          matchCount={matchCount}
          nextRoundNumber={nextRoundNumber}
          existingRounds={existingRounds}
          standingsMap={standingsMap}
        />
      </div>
    </main>
  )
}
