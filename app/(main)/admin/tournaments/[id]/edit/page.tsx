import { notFound, redirect } from "next/navigation"
import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { TournamentStatus } from "@/lib/types/tournament"
import { timestamptzToDatetimeLocal } from "@/lib/utils/datetime"
import type { TournamentUpdateFormData } from "@/lib/validations/tournament"
import { TournamentForm } from "../../new/tournament-form"

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // 大会取得
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, name, status")
    .eq("id", id)
    .single()

  if (tournamentError || !tournament) {
    notFound()
  }

  // イベント取得（event_number 昇順）
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(
      "id, name, entry_type, match_format, matches_per_event, max_participants, scheduled_date, entry_start, entry_end, checkin_start, checkin_end, rules",
    )
    .eq("tournament_id", id)
    .order("event_number", { ascending: true })

  if (eventsError) {
    notFound()
  }

  // フォーム用データに変換
  const defaultValues: TournamentUpdateFormData = {
    name: tournament.name,
    status: tournament.status as TournamentStatus,
    events: events.map((ev) => ({
      id: ev.id,
      name: ev.name,
      entry_type: ev.entry_type,
      match_format: ev.match_format,
      matches_per_event: ev.matches_per_event,
      max_participants: ev.max_participants ?? undefined,
      scheduled_date: ev.scheduled_date,
      entry_start: timestamptzToDatetimeLocal(ev.entry_start),
      entry_end: timestamptzToDatetimeLocal(ev.entry_end),
      checkin_start: timestamptzToDatetimeLocal(ev.checkin_start),
      checkin_end: timestamptzToDatetimeLocal(ev.checkin_end),
      rules: ev.rules ?? "",
    })),
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader title="大会編集" subtitle="大会情報を編集します" />
        <TournamentForm
          mode="edit"
          tournamentId={id}
          defaultValues={defaultValues}
        />
      </div>
    </main>
  )
}
