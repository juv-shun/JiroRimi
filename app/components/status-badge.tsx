import {
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
} from "@/lib/types/tournament"

const STATUS_STYLES: Record<TournamentStatus, { bg: string; text: string; dot: string }> = {
  draft: {
    bg: "bg-gradient-to-r from-gray-100 to-gray-50",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  open: {
    bg: "bg-gradient-to-r from-emerald-100 to-green-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  in_progress: {
    bg: "bg-gradient-to-r from-blue-100 to-sky-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  completed: {
    bg: "bg-gradient-to-r from-gray-100 to-slate-50",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
}

export function StatusBadge({ status }: { status: TournamentStatus }) {
  const styles = STATUS_STYLES[status]

  return (
    <span
      className={`status-badge ${styles.bg} ${styles.text} border border-current/10 shadow-sm`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${styles.dot} ${
          status === "open" || status === "in_progress" ? "animate-pulse" : ""
        }`}
      />
      {TOURNAMENT_STATUS_LABELS[status]}
    </span>
  )
}
