import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Calendar, Users } from "lucide-react"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { EntryWithProfile, RoleDistribution } from "@/lib/types/entry"
import type { Role } from "@/lib/types/profile"
import { ROLES } from "@/lib/types/profile"
import { formatDateJST } from "@/lib/utils/datetime"
import { RoleDistributionChart } from "./role-distribution-chart"
import { EntryTable } from "./entry-table"

function calculateRoleDistribution(
  entries: EntryWithProfile[],
): RoleDistribution[] {
  const total = entries.length
  const roleCounts: Partial<Record<Role, number>> = {}
  for (const entry of entries) {
    const role = entry.profiles?.first_role
    if (role) {
      roleCounts[role] = (roleCounts[role] ?? 0) + 1
    }
  }
  return ROLES.map((role) => ({
    role,
    count: roleCounts[role] ?? 0,
    percentage:
      total > 0 ? Math.round(((roleCounts[role] ?? 0) / total) * 100) : 0,
  }))
}

export default async function EntryListPage({
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
      "id, event_number, name, scheduled_date, tournaments!inner (id, name)",
    )
    .eq("id", eid)
    .eq("tournament_id", id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  // クエリ2: エントリー + プロフィール
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select(
      "id, created_at, profiles (player_name, avatar_url, first_role, second_role, third_role)",
    )
    .eq("event_id", eid)
    .order("created_at", { ascending: true })

  if (entriesError) {
    notFound()
  }

  // Supabase の FK リレーション結果を EntryWithProfile[] に変換
  // profiles は profile_id → profiles.id の多対一なので実際は単一オブジェクトだが、
  // Supabase の型推論では配列として返るためキャストする
  const entryList: EntryWithProfile[] = (entries ?? []).map((entry) => ({
    id: entry.id,
    created_at: entry.created_at,
    profiles: Array.isArray(entry.profiles)
      ? entry.profiles[0] ?? null
      : entry.profiles,
  }))
  const distribution = calculateRoleDistribution(entryList)
  // tournaments は !inner JOIN で単一オブジェクトだが、型推論では配列になるためキャスト
  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/tournaments/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          大会詳細に戻る
        </Link>

        <PageHeader
          title={tournament.name}
          subtitle={`${event.name} - エントリー一覧`}
        />

        {/* サマリーカード */}
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
                <p className="text-xs text-gray-500">エントリー人数</p>
                <p className="text-sm font-medium text-gray-900">
                  {entryList.length}人
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ロール分布 */}
        <div className="mb-6">
          <RoleDistributionChart distribution={distribution} />
        </div>

        {/* エントリー者テーブル */}
        <EntryTable entries={entryList} />
      </div>
    </main>
  )
}
