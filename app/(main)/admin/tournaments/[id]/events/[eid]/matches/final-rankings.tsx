import { Crown, Medal } from "lucide-react"
import type { TeamInfo } from "@/lib/types/bracket"

type FinalRankingsProps = {
  rankings: { rank: number; team: TeamInfo }[]
}

const RANK_STYLES = {
  1: {
    bg: "bg-gradient-to-r from-amber-50 to-yellow-50",
    border: "border-amber-300",
    badge: "bg-gradient-to-r from-amber-400 to-yellow-500 text-white",
    text: "text-amber-900",
    icon: <Crown className="w-4 h-4" />,
  },
  2: {
    bg: "bg-gradient-to-r from-gray-50 to-slate-50",
    border: "border-gray-300",
    badge: "bg-gradient-to-r from-gray-400 to-slate-500 text-white",
    text: "text-gray-700",
    icon: <Medal className="w-4 h-4" />,
  },
  3: {
    bg: "bg-gradient-to-r from-orange-50 to-amber-50",
    border: "border-orange-200",
    badge: "bg-gradient-to-r from-orange-400 to-amber-500 text-white",
    text: "text-orange-800",
    icon: <Medal className="w-4 h-4" />,
  },
  4: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    badge: "bg-gray-400 text-white",
    text: "text-gray-600",
    icon: null,
  },
} as const

export function FinalRankings({ rankings }: FinalRankingsProps) {
  if (rankings.length === 0) return null

  return (
    <div className="rich-card overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-3">
        <h2 className="font-bold text-sm tracking-wide">最終順位</h2>
      </div>
      <div className="p-5 space-y-3">
        {rankings.map(({ rank, team }) => {
          const style = RANK_STYLES[rank as keyof typeof RANK_STYLES] ?? RANK_STYLES[4]
          return (
            <div
              key={team.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${style.bg} ${style.border}`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${style.badge}`}
              >
                {style.icon ?? rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${style.text} truncate`}>
                  {team.name}
                </p>
                <p className="text-[10px] text-gray-400">Seed {team.seed}</p>
              </div>
              <span className={`text-lg font-bold ${style.text}`}>
                {rank}位
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
