import {
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
} from "@/lib/types/tournament"

const STATUS_STYLES: Record<TournamentStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  open: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
}

export function StatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {TOURNAMENT_STATUS_LABELS[status]}
    </span>
  )
}
