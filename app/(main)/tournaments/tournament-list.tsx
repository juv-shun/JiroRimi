import Link from "next/link"
import type { TournamentWithEventCount } from "@/lib/types/tournament"
import { StatusBadge } from "@/app/components/status-badge"

export function TournamentList({
  tournaments,
}: {
  tournaments: TournamentWithEventCount[]
}) {
  if (tournaments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-gray-500">
        現在公開中の大会はありません
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {tournaments.map((tournament) => (
        <Link
          key={tournament.id}
          href={`/tournaments/${tournament.id}`}
          className="block bg-white rounded-2xl shadow-sm border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {tournament.name}
            </h2>
            <StatusBadge status={tournament.status} />
          </div>
        </Link>
      ))}
    </div>
  )
}
