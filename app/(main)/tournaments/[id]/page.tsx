import { notFound } from "next/navigation"
import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { TournamentEventForDisplay } from "@/lib/types/tournament"
import { EventList } from "./event-list"

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 1. 大会とイベント情報（エントリー数付き、event_number昇順）
  // 表示に必要な最小限のフィールドのみ取得
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select(
      `
      id, name, status,
      events (
        id, event_number, name, entry_type, match_format,
        matches_per_event, max_participants, scheduled_date,
        entry_start, entry_end, checkin_start, checkin_end,
        rules,
        entries (count)
      )
    `,
    )
    .eq("id", id)
    .neq("status", "draft")
    .order("event_number", { referencedTable: "events", ascending: true })
    .single()

  // エラーハンドリング: 存在しない or draft の場合
  if (error || !tournament) {
    notFound()
  }

  // 2. ログインユーザーのエントリー状態
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userEntries: string[] = []
  if (user && tournament.events.length > 0) {
    const eventIds = tournament.events.map((e) => e.id)
    const { data: entries } = await supabase
      .from("entries")
      .select("event_id")
      .eq("profile_id", user.id)
      .in("event_id", eventIds)
    userEntries = entries?.map((e) => e.event_id) ?? []
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader title={tournament.name} />

        <EventList
          events={tournament.events as TournamentEventForDisplay[]}
          isLoggedIn={!!user}
          userEntries={userEntries}
        />
      </div>
    </main>
  )
}
