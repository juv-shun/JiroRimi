import { Calendar, ChevronLeft, Swords, Users } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type {
  RawBracketMatch,
  TeamInfo,
  TeamMemberInfo,
} from "@/lib/types/bracket"
import type {
  AdminMatchForDisplay,
  AdminMatchParticipant,
  ExistingMatchInfo,
  ExistingRound,
  MatchResult,
  MatchStatus,
  ParticipantInfo,
  RankedPlayerStanding,
  Team,
  Vote,
} from "@/lib/types/match"
import type { Role } from "@/lib/types/profile"
import { formatDateJST } from "@/lib/utils/datetime"
import {
  computeRankings,
  computeStandings,
  mergeStandings,
} from "@/lib/utils/match-result"
import { BracketAdminView } from "./bracket-admin-view"
import { GfTeamAssignmentWrapper } from "./gf-team-assignment-wrapper"
import { RoundManager } from "./round-manager"

type TeamMemberRow = {
  profile_id: string
  profiles:
    | {
        player_name: string | null
        avatar_url: string | null
        first_role: string | null
      }
    | {
        player_name: string | null
        avatar_url: string | null
        first_role: string | null
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
    }
  })
}

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
      "id, name, scheduled_date, status, matches_per_event, match_format, tournament_id, tournaments!inner(id, name)",
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

  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

  // チェックイン済みエントリー取得（profiles JOIN）
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select(
      "profile_id, profiles (id, player_name, discord_username, avatar_url, first_role, second_role, third_role)",
    )
    .eq("event_id", eid)
    .not("checked_in_at", "is", null)
    .order("created_at", { ascending: true })

  if (entriesError) {
    notFound()
  }

  const participants: ParticipantInfo[] = (entries ?? []).map((entry) => {
    const p = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles
    return {
      profileId: entry.profile_id,
      playerName: p?.player_name ?? null,
      discordUsername: p?.discord_username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      firstRole: (p?.first_role as Role) ?? null,
      secondRole: (p?.second_role as Role) ?? null,
      thirdRole: (p?.third_role as Role) ?? null,
    }
  })

  const isGf = event.match_format === "double_elimination"

  // --- GF (double_elimination) の場合 ---
  if (isGf) {
    // 同大会の予選イベントからマッチを取得して予選成績を集計
    const { data: qualifierEvents } = await supabase
      .from("events")
      .select("id")
      .eq("tournament_id", event.tournament_id)
      .eq("match_format", "qualifier")

    let rankings: RankedPlayerStanding[] = []

    if (qualifierEvents && qualifierEvents.length > 0) {
      const qualifierEventIds = qualifierEvents.map((e) => e.id)

      const { data: qualifierMatches } = await supabase
        .from("matches")
        .select(
          `
          id,
          round_number,
          lobby_number,
          status,
          result,
          event_id,
          match_participants (
            id,
            profile_id,
            team,
            vote,
            profiles (player_name, avatar_url, first_role)
          )
        `,
        )
        .in("event_id", qualifierEventIds)
        .eq("status", "confirmed")

      if (qualifierMatches && qualifierMatches.length > 0) {
        // イベントごとに成績を集計
        const eventMatchMap = new Map<string, AdminMatchForDisplay[]>()
        for (const m of qualifierMatches) {
          const eventId = m.event_id as string
          if (!eventMatchMap.has(eventId)) {
            eventMatchMap.set(eventId, [])
          }
          const matchParticipants = (m.match_participants ?? []).map((mp) => {
            const prof = Array.isArray(mp.profiles)
              ? mp.profiles[0]
              : mp.profiles
            return {
              profileId: mp.profile_id,
              playerName: prof?.player_name ?? null,
              avatarUrl: prof?.avatar_url ?? null,
              firstRole: (prof?.first_role as Role) ?? null,
              team: mp.team as Team,
              vote: mp.vote as Vote | null,
            } satisfies AdminMatchParticipant
          })
          eventMatchMap.get(eventId)!.push({
            matchId: m.id,
            roundNumber: m.round_number,
            lobbyNumber: m.lobby_number,
            status: m.status as MatchStatus,
            result: m.result as MatchResult,
            teamA: matchParticipants.filter((p) => p.team === "team_a"),
            teamB: matchParticipants.filter((p) => p.team === "team_b"),
          })
        }

        const standingsArray = Array.from(eventMatchMap.values()).map(
          (matches) => computeStandings(matches),
        )
        const merged = mergeStandings(standingsArray)
        rankings = computeRankings(merged)
      }
    }

    // tournament_teams の存在チェック
    const { count: teamCount } = await supabase
      .from("tournament_teams")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eid)

    const teamsAssigned = (teamCount ?? 0) > 0

    // チーム確定済みの場合：ブラケット管理画面
    if (teamsAssigned) {
      const { data: existingTeams } = await supabase
        .from("tournament_teams")
        .select(
          `
          id, name, seed,
          tournament_team_members (
            profile_id,
            profiles (player_name, avatar_url, first_role)
          )
        `,
        )
        .eq("event_id", eid)
        .order("seed")

      const teamsForBracket: TeamInfo[] = (existingTeams ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        seed: t.seed,
        members: mapTeamMembers(
          t.tournament_team_members as TeamMemberRow[] | null,
        ),
      }))

      const { data: bracketMatchesRaw } = await supabase
        .from("bracket_matches")
        .select(
          "id, bracket_type, round_number, match_order, team_a_id, team_b_id, winner_team_id, status",
        )
        .eq("event_id", eid)

      const bracketMatches: RawBracketMatch[] = (bracketMatchesRaw ?? []).map(
        (m) => ({
          id: m.id,
          bracket_type: m.bracket_type,
          round_number: m.round_number,
          match_order: m.match_order,
          team_a_id: m.team_a_id,
          team_b_id: m.team_b_id,
          winner_team_id: m.winner_team_id,
          status: m.status,
        }),
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

            {/* GFサマリーカード */}
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
              <div className="grid grid-cols-2 gap-4">
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
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">参加者</p>
                    <p className="text-sm font-medium text-gray-900">
                      {participants.length}人
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <BracketAdminView
              initialBracketMatches={bracketMatches}
              teams={teamsForBracket}
              eventId={eid}
              tournamentId={id}
            />
          </div>
        </main>
      )
    }

    // チーム未作成：GfTeamAssignmentBoard 表示
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
            subtitle={`${event.name} - チーム編成`}
          />

          {/* GFサマリーカード */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
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
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">GF進出者</p>
                  <p className="text-sm font-medium text-gray-900">
                    {participants.length}人
                  </p>
                </div>
              </div>
            </div>
          </div>

          <GfTeamAssignmentWrapper
            participants={participants}
            eventId={eid}
            rankings={rankings}
          />
        </div>
      </main>
    )
  }

  // --- 予選 (qualifier) の場合 --- 既存ロジックそのまま

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
        profiles (player_name, discord_username, avatar_url, first_role, second_role, third_role)
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
        discordUsername: prof?.discord_username ?? null,
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
        const prof = Array.isArray(mp.profiles) ? mp.profiles[0] : mp.profiles
        const participant: ParticipantInfo = {
          profileId: mp.profile_id,
          playerName: prof?.player_name ?? null,
          discordUsername: prof?.discord_username ?? null,
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

  const roundNumbers = [...new Set(matchList.map((m) => m.roundNumber))].sort(
    (a, b) => a - b,
  )
  const matchCount = participants.length / 10

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
          eventStatus={event.status}
          participants={participants}
          matchCount={matchCount}
          existingRounds={existingRounds}
          standingsMap={standingsMap}
        />
      </div>
    </main>
  )
}
