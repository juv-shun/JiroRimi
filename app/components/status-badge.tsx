import {
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
} from "@/lib/types/tournament"

const STATUS_STYLES: Record<TournamentStatus, { bg: string; text: string; dot: string }> = {
  draft: {
    bg: "bg-white/5 border-white/10",
    text: "text-stone-300",
    dot: "bg-stone-500",
  },
  open: {
    bg: "bg-emerald-500/10 border-emerald-400/20",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  in_progress: {
    bg: "bg-primary/12 border-primary/30",
    text: "text-rose-200",
    dot: "bg-primary",
  },
  completed: {
    bg: "bg-[#d8a24c]/10 border-[#d8a24c]/20",
    text: "text-[#f2d7aa]",
    dot: "bg-[#d8a24c]",
  },
}

export function StatusBadge({ status }: { status: TournamentStatus }) {
  const styles = STATUS_STYLES[status]

  return (
    <span
      className={`status-badge ${styles.bg} ${styles.text} border shadow-sm`}
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
