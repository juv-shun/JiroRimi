import { StatusBadge } from "@/app/components/status-badge"
import type { TournamentWithEvents } from "@/lib/types/tournament"

import { EventList } from "./event-list"

export function TournamentList({
  tournaments,
  isLoggedIn,
  userEntries,
  userGender,
  isAdmin,
}: {
  tournaments: TournamentWithEvents[]
  isLoggedIn: boolean
  userEntries: string[]
  userGender: string | null
  isAdmin: boolean
}) {
  if (tournaments.length === 0) {
    return (
      <div className="rich-card p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-light to-orange-100 mb-4">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">現在公開中の大会はありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {tournaments.map((tournament, index) => (
        <section
          key={tournament.id}
          className="tournament-section opacity-0"
          style={{
            animation: `card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s forwards`,
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-primary to-amber-400" />
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {tournament.name}
              </h2>
            </div>
            <StatusBadge status={tournament.status} />
          </div>

          <EventList
            tournamentId={tournament.id}
            events={tournament.events}
            isLoggedIn={isLoggedIn}
            userEntries={userEntries}
            userGender={userGender}
            isAdmin={isAdmin}
          />
        </section>
      ))}
    </div>
  )
}
