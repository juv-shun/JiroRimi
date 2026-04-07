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
      <div className="rich-card rounded-2xl p-8 text-center text-text-secondary">
        大会がまだ作成されていません
      </div>
    )
  }

  return (
    <div className="rich-card overflow-x-auto rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#d8a24c]/10 text-left text-text-secondary">
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
              className="border-b border-white/6 transition-colors hover:bg-white/[0.03] last:border-b-0"
            >
              <td className="px-4 py-3 font-medium text-text-primary">
                {tournament.name}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={tournament.status} />
              </td>
              <td className="px-4 py-3 text-center text-text-secondary">
                {tournament.events[0]?.count ?? 0}
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {formatDate(tournament.created_at)}
              </td>
              <td className="px-4 py-3 text-center">
                <Link
                  href={`/admin/tournaments/${tournament.id}/edit`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-[#f2d7aa]"
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
