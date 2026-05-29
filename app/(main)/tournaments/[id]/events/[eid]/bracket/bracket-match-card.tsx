"use client"

import { ChevronDown, User } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import type { BracketMatchForDisplay, TeamInfo } from "@/lib/types/bracket"
import type { Role } from "@/lib/types/profile"
import { ROLE_BADGE_COLORS, ROLE_LABELS } from "@/lib/types/profile"

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

function isAllowedAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false
    }
    const { hostname } = parsed
    return (
      hostname === "cdn.discordapp.com" ||
      hostname.endsWith(".discordapp.com") ||
      hostname.endsWith(".discord.com")
    )
  } catch {
    return false
  }
}

function toRole(role: string | null): Role | null {
  if (role && role in ROLE_LABELS) {
    return role as Role
  }
  return null
}

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
      />
    </div>
  )
}

function TeamRow({
  team,
  isWinner,
  isLoser,
}: {
  team: TeamInfo | null
  isWinner: boolean
  isLoser: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

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

  const members = team.members ?? []

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3 py-2 w-full text-left transition-colors hover:bg-white/60"
      >
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/10 to-amber-100 flex items-center justify-center text-[10px] text-primary font-bold flex-shrink-0">
          {team.seed}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm truncate ${
              isWinner
                ? "font-bold text-primary"
                : isLoser
                  ? "text-gray-400 line-through"
                  : "text-gray-900"
            }`}
          >
            {team.name}
          </span>
          <span className="block text-[10px] text-gray-500 leading-tight">
            {members.length}人
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-3 pb-2 space-y-1">
          {members.map((member) => {
            const role = toRole(member.firstRole)
            return (
              <div
                key={member.profileId}
                className="flex items-center gap-2 rounded-lg bg-white/60 px-2 py-1.5"
              >
                {member.avatarUrl && isAllowedAvatarUrl(member.avatarUrl) ? (
                  <Image
                    src={member.avatarUrl}
                    alt=""
                    width={24}
                    height={24}
                    loading="lazy"
                    unoptimized
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                  </span>
                )}
                <span className="min-w-0 flex-1 text-xs font-medium text-gray-800 truncate">
                  {member.playerName ?? "（未設定）"}
                </span>
                {role && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight flex-shrink-0 ${ROLE_BADGE_COLORS[role]}`}
                  >
                    {ROLE_LABELS[role]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
