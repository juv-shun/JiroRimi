import { Pencil } from "lucide-react"
import Link from "next/link"
import type { TournamentWithEventCount } from "@/lib/types/tournament"
import { StatusBadge } from "@/app/components/status-badge"

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(dateString))
}

export function TournamentList({
  tournaments,
}: {
  tournaments: TournamentWithEventCount[]
}) {
  if (tournaments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-gray-500">
        大会がまだ作成されていません
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-gray-500">
            <th className="px-4 py-3 font-medium">大会名</th>
            <th className="px-4 py-3 font-medium">ステータス</th>
            <th className="px-4 py-3 font-medium text-center">イベント数</th>
            <th className="px-4 py-3 font-medium">作成日</th>
            <th className="px-4 py-3 font-medium text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((tournament) => (
            <tr
              key={tournament.id}
              className="border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-gray-900">
                {tournament.name}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={tournament.status} />
              </td>
              <td className="px-4 py-3 text-center text-gray-600">
                {tournament.events[0]?.count ?? 0}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {formatDate(tournament.created_at)}
              </td>
              <td className="px-4 py-3 text-center">
                <Link
                  href={`/admin/tournaments/${tournament.id}/edit`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
