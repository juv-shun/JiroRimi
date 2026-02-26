import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft, Calendar, Users, Hash } from "lucide-react"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { ParticipantInfo } from "@/lib/types/match"
import type { Role } from "@/lib/types/profile"
import { formatDateJST } from "@/lib/utils/datetime"
import { TeamAssignmentBoard } from "./team-assignment-board"

export default async function TeamAssignmentPage({
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

  // イベント + 大会名を取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, name, scheduled_date, status, tournaments!inner (id, name)",
    )
    .eq("id", eid)
    .eq("tournament_id", id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  // in_progress でなければ大会編集画面にリダイレクト
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

  // 次ラウンド番号算出
  const { data: maxRoundData } = await supabase
    .from("matches")
    .select("round_number")
    .eq("event_id", eid)
    .order("round_number", { ascending: false })
    .limit(1)

  const currentMax =
    maxRoundData && maxRoundData.length > 0
      ? maxRoundData[0].round_number
      : 0
  const roundNumber = currentMax + 1

  const matchCount = participants.length / 10
  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

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
                  {participants.length}人（{matchCount}マッチ）
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">ラウンド</p>
                <p className="text-sm font-medium text-gray-900">
                  Round {roundNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* チーム編成ボード */}
        <TeamAssignmentBoard
          participants={participants}
          matchCount={matchCount}
          roundNumber={roundNumber}
          eventId={eid}
          tournamentId={id}
        />
      </div>
    </main>
  )
}
