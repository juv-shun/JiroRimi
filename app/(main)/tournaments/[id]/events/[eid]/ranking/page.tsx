import { Calendar, ChevronLeft, Swords, Trophy, User, Users } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type {
  AdminMatchForDisplay,
  AdminMatchParticipant,
  MatchResult,
  MatchStatus,
  RankedPlayerStanding,
  Team,
  Vote,
} from "@/lib/types/match"
import type { Role } from "@/lib/types/profile"
import { formatDateJST } from "@/lib/utils/datetime"
import { computeRankings, computeStandings } from "@/lib/utils/match-result"

function isAllowedAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false
    }
    const { hostname } = parsed
    return (
      hostname === "cdn.discordapp.com" ||
      hostname.endsWith(".discordapp.com") ||
      hostname.endsWith(".discord.com")
    )
  } catch {
    return false
  }
}

export default async function RankingPage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>
}) {
  const { id, eid } = await params
  const supabase = await createClient()

  // クエリ1: イベント + 大会名（大会IDとイベントIDの組み合わせを検証）
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, name, scheduled_date, matches_per_event, tournaments!inner(id, name)",
    )
    .eq("id", eid)
    .eq("tournament_id", id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  // クエリ2: マッチ + 参加者
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
        profiles (player_name, avatar_url, first_role)
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

  const standings = computeStandings(matchList)
  const rankings = computeRankings(standings)

  const confirmedMatches = matchList.filter((m) => m.status === "confirmed")
  const roundNumbers = [
    ...new Set(confirmedMatches.map((m) => m.roundNumber)),
  ].sort((a, b) => a - b)

  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          大会一覧に戻る
        </Link>

        <PageHeader
          title={tournament.name}
          subtitle={`${event.name} - ランキング`}
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
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">参加者</p>
                <p className="text-sm font-medium text-gray-900">
                  {rankings.length}人
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Swords className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">ラウンド</p>
                <p className="text-sm font-medium text-gray-900">
                  {roundNumbers.length}
                  {event.matches_per_event
                    ? `/${event.matches_per_event}`
                    : ""}
                  {" "}完了
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ランキングテーブル */}
        {rankings.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                ランキング
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 w-12">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">
                    プレイヤー
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 w-16">
                    勝
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 w-16">
                    敗
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 w-20">
                    勝率
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r) => (
                  <tr
                    key={r.profileId}
                    className="border-b border-gray-50 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-gray-400 font-medium">
                      {r.rank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar
                          avatarUrl={r.avatarUrl}
                          playerName={r.playerName}
                        />
                        <span className="font-medium text-gray-900 truncate">
                          {r.playerName ?? "（未設定）"}
                        </span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 font-semibold text-green-600">
                      {r.wins}
                    </td>
                    <td className="text-center px-4 py-3 font-semibold text-red-600">
                      {r.losses}
                    </td>
                    <td className="text-center px-4 py-3 font-medium text-gray-700">
                      {(r.winRate * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center mb-6">
            <p className="text-gray-500 text-sm">
              まだ確定した試合がありません
            </p>
          </div>
        )}

        {/* 対戦履歴 */}
        {roundNumbers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              対戦履歴
            </h2>
            {roundNumbers.map((rn) => (
              <RoundSection
                key={rn}
                roundNumber={rn}
                matches={confirmedMatches.filter(
                  (m) => m.roundNumber === rn,
                )}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function PlayerAvatar({
  avatarUrl,
  playerName,
}: {
  avatarUrl: string | null
  playerName: string | null
}) {
  if (avatarUrl && isAllowedAvatarUrl(avatarUrl)) {
    return (
      <img
        src={avatarUrl}
        alt={playerName ?? ""}
        loading="lazy"
        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
      <User className="w-3 h-3 text-gray-400" />
    </div>
  )
}

function RoundSection({
  roundNumber,
  matches,
}: {
  roundNumber: number
  matches: AdminMatchForDisplay[]
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-700">
          ラウンド {roundNumber}
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {matches.map((match) => (
          <MatchCard key={match.matchId} match={match} />
        ))}
      </div>
    </div>
  )
}

function MatchCard({ match }: { match: AdminMatchForDisplay }) {
  const isTeamAWin = match.result === "team_a"
  const isTeamBWin = match.result === "team_b"

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Team A */}
        <div className={`flex-1 ${isTeamAWin ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {match.teamA.map((p) => (
              <div
                key={p.profileId}
                className="flex items-center gap-1 text-xs"
              >
                <PlayerAvatar
                  avatarUrl={p.avatarUrl}
                  playerName={p.playerName}
                />
                <span className="text-gray-700 truncate max-w-[80px]">
                  {p.playerName ?? "?"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Result */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              isTeamAWin
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {isTeamAWin ? "WIN" : "LOSE"}
          </span>
          <span className="text-gray-300 text-xs">vs</span>
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              isTeamBWin
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {isTeamBWin ? "WIN" : "LOSE"}
          </span>
        </div>

        {/* Team B */}
        <div className={`flex-1 ${isTeamBWin ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap gap-1.5">
            {match.teamB.map((p) => (
              <div
                key={p.profileId}
                className="flex items-center gap-1 text-xs"
              >
                <PlayerAvatar
                  avatarUrl={p.avatarUrl}
                  playerName={p.playerName}
                />
                <span className="text-gray-700 truncate max-w-[80px]">
                  {p.playerName ?? "?"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
