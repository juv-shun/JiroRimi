import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft, Calendar, Swords } from "lucide-react"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type {
  AdminMatchForDisplay,
  AdminMatchParticipant,
} from "@/lib/types/match"
import type { Role } from "@/lib/types/profile"
import { formatDateJST } from "@/lib/utils/datetime"
import { MatchManagement } from "./match-management"

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

  // マッチ + 参加者
  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select(
      "id, round_number, lobby_number, status, result, match_participants(id, profile_id, team, vote, profiles(player_name, avatar_url, first_role))",
    )
    .eq("event_id", eid)
    .order("round_number")
    .order("created_at")

  if (matchError) {
    notFound()
  }

  // AdminMatchForDisplay[] に変換
  const matchList: AdminMatchForDisplay[] = (matches ?? []).map((m) => {
    const participants = (m.match_participants ?? []).map((mp) => {
      const prof = Array.isArray(mp.profiles) ? mp.profiles[0] : mp.profiles
      return {
        profileId: mp.profile_id,
        playerName: prof?.player_name ?? null,
        avatarUrl: prof?.avatar_url ?? null,
        firstRole: (prof?.first_role as Role) ?? null,
        team: mp.team as "team_a" | "team_b",
        vote: mp.vote as "win" | "lose" | null,
      } satisfies AdminMatchParticipant
    })

    return {
      matchId: m.id,
      roundNumber: m.round_number,
      lobbyNumber: m.lobby_number,
      status: m.status as "waiting" | "in_progress" | "confirmed",
      result: m.result as "team_a" | "team_b" | null,
      teamA: participants.filter((p) => p.team === "team_a"),
      teamB: participants.filter((p) => p.team === "team_b"),
    }
  })

  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

  // ラウンド進行状況
  const roundNumbers = [...new Set(matchList.map((m) => m.roundNumber))].sort()
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
          subtitle={`${event.name} - 試合進行管理`}
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

        <MatchManagement
          matches={matchList}
          totalRounds={event.matches_per_event}
          eventId={eid}
          tournamentId={id}
          eventStatus={event.status}
        />
      </div>
    </main>
  )
}
