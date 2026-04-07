import { StatusBadge } from "@/app/components/status-badge"
import type { TournamentWithEvents, UserEntryInfo } from "@/lib/types/tournament"

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
  userEntries: UserEntryInfo[]
  userGender: string | null
  isAdmin: boolean
}) {
  if (tournaments.length === 0) {
    return (
      <div className="rich-card p-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d8a24c]/20 bg-white/5">
          <svg
            className="h-8 w-8 text-[#d8a24c]"
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
        <p className="text-sm text-text-secondary">現在公開中の大会はありません</p>
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
          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-[#d8a24c] via-[#f4efe6] to-primary" />
              <div>
                <p className="panel-title mb-1">Tournament</p>
                <h2 className="text-xl font-bold tracking-tight text-[#f4efe6]">
                  {tournament.name}
                </h2>
              </div>
            </div>
            <div className="ml-auto">
              <StatusBadge status={tournament.status} />
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8a24c]">
              Match Schedule
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              進行中の大会とエントリー可能なイベントを一覧で確認できます。
            </p>
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
