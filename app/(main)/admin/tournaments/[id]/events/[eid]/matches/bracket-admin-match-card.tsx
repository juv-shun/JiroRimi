"use client"

import { useState } from "react"
import type { BracketMatchForDisplay, TeamInfo } from "@/lib/types/bracket"
import { canConfirmBracketMatch } from "@/lib/utils/bracket"

type BracketAdminMatchCardProps = {
  match: BracketMatchForDisplay
  onConfirm: (matchId: string, winnerTeam: TeamInfo) => void
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

export function BracketAdminMatchCard({
  match,
  onConfirm,
}: BracketAdminMatchCardProps) {
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null)
  const style = STATUS_STYLES[match.status]
  const isConfirmed = match.status === "confirmed"
  const canConfirm = canConfirmBracketMatch(match)

  const handleConfirm = () => {
    if (!selectedWinnerId) return
    const winnerTeam =
      match.teamA?.id === selectedWinnerId ? match.teamA : match.teamB
    if (winnerTeam) onConfirm(match.id, winnerTeam)
  }

  return (
    <div
      className={`relative rounded-xl border ${style.card} overflow-hidden`}
    >
      {style.badge && (
        <span
          className={`absolute top-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style.badge.className}`}
        >
          {style.badge.text}
        </span>
      )}
      <TeamRow
        team={match.teamA}
        isWinner={
          isConfirmed &&
          match.winner !== null &&
          match.teamA !== null &&
          match.winner.id === match.teamA.id
        }
        isLoser={
          isConfirmed &&
          match.winner !== null &&
          match.teamA !== null &&
          match.winner.id !== match.teamA.id
        }
        canSelect={canConfirm}
        isSelected={selectedWinnerId === match.teamA?.id}
        onSelect={() => match.teamA && setSelectedWinnerId(match.teamA.id)}
      />
      <div className="border-t border-inherit" />
      <TeamRow
        team={match.teamB}
        isWinner={
          isConfirmed &&
          match.winner !== null &&
          match.teamB !== null &&
          match.winner.id === match.teamB.id
        }
        isLoser={
          isConfirmed &&
          match.winner !== null &&
          match.teamB !== null &&
          match.winner.id !== match.teamB.id
        }
        canSelect={canConfirm}
        isSelected={selectedWinnerId === match.teamB?.id}
        onSelect={() => match.teamB && setSelectedWinnerId(match.teamB.id)}
      />
      {canConfirm && (
        <div className="border-t border-inherit px-3 py-2 bg-white/50">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedWinnerId}
            className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg text-white glow-button disabled:opacity-40 disabled:cursor-not-allowed"
          >
            確定
          </button>
        </div>
      )}
    </div>
  )
}

function TeamRow({
  team,
  isWinner,
  isLoser,
  canSelect,
  isSelected,
  onSelect,
}: {
  team: TeamInfo | null
  isWinner: boolean
  isLoser: boolean
  canSelect: boolean
  isSelected: boolean
  onSelect: () => void
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
    <button
      type="button"
      onClick={canSelect ? onSelect : undefined}
      disabled={!canSelect}
      className={`flex items-center gap-2 px-3 py-2 w-full text-left transition-colors ${
        canSelect ? "hover:bg-white/60 cursor-pointer" : "cursor-default"
      } ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
    >
      {canSelect && (
        <span
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            isSelected
              ? "border-primary bg-primary"
              : "border-gray-300 bg-white"
          }`}
        >
          {isSelected && (
            <span className="w-2 h-2 rounded-full bg-white" />
          )}
        </span>
      )}
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
    </button>
  )
}
