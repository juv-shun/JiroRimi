import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft, Calendar, Users, Clock } from "lucide-react"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { EntryWithProfile } from "@/lib/types/entry"
import type { EntryType, EventStatus } from "@/lib/types/tournament"
import { formatDateJST, formatDateTimeJST } from "@/lib/utils/datetime"
import { CheckinTable } from "./checkin-table"

export default async function AdminCheckinPage({
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

  // クエリ1: イベント + 大会名
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, name, scheduled_date, checkin_start, checkin_end, status, entry_type, tournaments!inner (id, name)",
    )
    .eq("id", eid)
    .eq("tournament_id", id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  // クエリ2: エントリー一覧（checked_in_at 含む）
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select(
      "id, created_at, checked_in_at, profiles (player_name, avatar_url, first_role, second_role, third_role)",
    )
    .eq("event_id", eid)
    .order("created_at", { ascending: true })

  if (entriesError) {
    notFound()
  }

  const entryList: EntryWithProfile[] = (entries ?? []).map((entry) => ({
    id: entry.id,
    created_at: entry.created_at,
    checked_in_at: entry.checked_in_at,
    profiles: Array.isArray(entry.profiles)
      ? entry.profiles[0] ?? null
      : entry.profiles,
  }))

  const checkedInCount = entryList.filter((e) => e.checked_in_at !== null).length
  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/admin/tournaments/${id}/edit`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          大会編集に戻る
        </Link>

        <PageHeader
          title={tournament.name}
          subtitle={`${event.name} - チェックイン管理`}
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
                <p className="text-xs text-gray-500">チェックイン</p>
                <p className="text-sm font-medium text-gray-900">
                  {checkedInCount}/{entryList.length}人
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">チェックイン時間帯</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDateTimeJST(event.checkin_start)} 〜{" "}
                  {formatDateTimeJST(event.checkin_end)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* チェックイン管理テーブル */}
        <CheckinTable
          entries={entryList}
          eventId={eid}
          eventStatus={event.status as EventStatus}
          entryType={event.entry_type as EntryType}
        />
      </div>
    </main>
  )
}
