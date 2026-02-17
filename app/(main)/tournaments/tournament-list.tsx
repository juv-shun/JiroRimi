import type { TournamentWithEvents } from "@/lib/types/tournament"
import { StatusBadge } from "@/app/components/status-badge"
import { EventList } from "./event-list"

export function TournamentList({
  tournaments,
  isLoggedIn,
  userEntries,
}: {
  tournaments: TournamentWithEvents[]
  isLoggedIn: boolean
  userEntries: string[]
}) {
  if (tournaments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-gray-500">
        現在公開中の大会はありません
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {tournaments.map((tournament) => (
        <section key={tournament.id}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {tournament.name}
            </h2>
            <StatusBadge status={tournament.status} />
          </div>

          <EventList
            tournamentId={tournament.id}
            events={tournament.events}
            isLoggedIn={isLoggedIn}
            userEntries={userEntries}
          />
        </section>
      ))}
    </div>
  )
}
