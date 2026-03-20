import type { BracketMatchForDisplay } from "@/lib/types/bracket"

type BracketMatchCardProps = {
  match: BracketMatchForDisplay
}

const STATUS_STYLES = {
  pending: {
    card: "bg-gray-50 border-gray-200",
    badge: null,
  },
  ready: {
    card: "bg-blue-50 border-blue-200",
    badge: { text: "準備完了", className: "bg-blue-100 text-blue-700" },
  },
  in_progress: {
    card: "bg-amber-50 border-amber-300",
    badge: {
      text: "試合中",
      className: "bg-amber-100 text-amber-700 animate-pulse",
    },
  },
  confirmed: {
    card: "bg-white border-green-300",
    badge: { text: "確定", className: "bg-green-100 text-green-700" },
  },
} as const

export function BracketMatchCard({ match }: BracketMatchCardProps) {
  const style = STATUS_STYLES[match.status]
  const isConfirmed = match.status === "confirmed"

  return (
    <div className={`relative rounded-xl border ${style.card} overflow-hidden`}>
      {style.badge && (
        <span
          className={`absolute top-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style.badge.className}`}
        >
          {style.badge.text}
        </span>
      )}
      <TeamRow
        team={match.teamA}
        isWinner={isConfirmed && match.winner !== null && match.teamA !== null && match.winner.id === match.teamA.id}
        isLoser={isConfirmed && match.winner !== null && match.teamA !== null && match.winner.id !== match.teamA.id}
      />
      <div className="border-t border-inherit" />
      <TeamRow
        team={match.teamB}
        isWinner={isConfirmed && match.winner !== null && match.teamB !== null && match.winner.id === match.teamB.id}
        isLoser={isConfirmed && match.winner !== null && match.teamB !== null && match.winner.id !== match.teamB.id}
      />
    </div>
  )
}

function TeamRow({
  team,
  isWinner,
  isLoser,
}: {
  team: { id: string; name: string; seed: number } | null
  isWinner: boolean
  isLoser: boolean
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-bold flex-shrink-0">
          ?
        </span>
        <span className="text-sm text-gray-400 italic">TBD</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/10 to-amber-100 flex items-center justify-center text-[10px] text-primary font-bold flex-shrink-0">
        {team.seed}
      </span>
      <span
        className={`text-sm truncate ${
          isWinner
            ? "font-bold text-primary"
            : isLoser
              ? "text-gray-400 line-through"
              : "text-gray-900"
        }`}
      >
        {team.name}
      </span>
    </div>
  )
}
