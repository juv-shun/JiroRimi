import type { BracketRound } from "@/lib/types/bracket"

import { BracketMatchCard } from "./bracket-match-card"

type BracketSectionProps = {
  title: string
  rounds: BracketRound[]
  colorClass: "amber" | "blue" | "purple"
}

const COLOR_MAP = {
  amber: {
    bg: "bg-gradient-to-r from-amber-500 to-orange-500",
    text: "text-white",
  },
  blue: {
    bg: "bg-gradient-to-r from-blue-500 to-indigo-500",
    text: "text-white",
  },
  purple: {
    bg: "bg-gradient-to-r from-purple-500 to-pink-500",
    text: "text-white",
  },
}

const ROUND_LABELS: Record<string, Record<number, string>> = {
  winners: { 1: "Winners Round 1", 2: "Winners Final" },
  losers: { 1: "Losers Round 1", 2: "Losers Final" },
  grand_final: { 1: "Grand Final", 2: "Reset Match" },
}

function getRoundLabel(bracketType: string, roundNumber: number): string {
  return ROUND_LABELS[bracketType]?.[roundNumber] ?? `Round ${roundNumber}`
}

function getMobileAnnotation(
  bracketType: string,
  roundNumber: number,
): string | null {
  if (bracketType === "winners" && roundNumber === 1) {
    return "勝者 → Winners Final / 敗者 → Losers R1"
  }
  if (bracketType === "winners" && roundNumber === 2) {
    return "勝者 → Grand Final / 敗者 → Losers Final"
  }
  if (bracketType === "losers" && roundNumber === 1) {
    return "勝者 → Losers Final"
  }
  if (bracketType === "losers" && roundNumber === 2) {
    return "勝者 → Grand Final"
  }
  if (bracketType === "grand_final" && roundNumber === 1) {
    return "ルーザーズ側が勝利 → Reset Match"
  }
  return null
}

export function BracketSection({ title, rounds, colorClass }: BracketSectionProps) {
  if (rounds.length === 0) return null

  const colors = COLOR_MAP[colorClass]

  return (
    <div className="rich-card overflow-hidden">
      <div className={`${colors.bg} ${colors.text} px-5 py-3`}>
        <h2 className="font-bold text-sm tracking-wide">{title}</h2>
      </div>

      {/* デスクトップ: 横配置 */}
      <div className="hidden md:block p-5">
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))`,
          }}
        >
          {rounds.map((round) => {
            const bracketType =
              round.matches[0]?.bracketType ?? "winners"
            return (
              <div key={round.roundNumber}>
                <p className="text-xs font-semibold text-gray-500 mb-3 text-center">
                  {getRoundLabel(bracketType, round.roundNumber)}
                </p>
                <div className="flex flex-col justify-center gap-4 h-full">
                  {round.matches.map((match) => (
                    <BracketMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* モバイル: 縦積み */}
      <div className="md:hidden p-4 space-y-4">
        {rounds.map((round) => {
          const bracketType =
            round.matches[0]?.bracketType ?? "winners"
          const annotation = getMobileAnnotation(
            bracketType,
            round.roundNumber,
          )
          return (
            <div key={round.roundNumber}>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                {getRoundLabel(bracketType, round.roundNumber)}
              </p>
              <div className="space-y-3">
                {round.matches.map((match) => (
                  <BracketMatchCard key={match.id} match={match} />
                ))}
              </div>
              {annotation && (
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  {annotation}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
