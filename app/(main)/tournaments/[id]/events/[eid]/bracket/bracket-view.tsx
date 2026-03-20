"use client"

import { Trophy } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import { useBracketRealtime } from "@/lib/hooks/use-bracket-realtime"
import type { RawBracketMatch, TeamInfo } from "@/lib/types/bracket"
import { organizeBracketData } from "@/lib/utils/bracket"

import { BracketSection } from "./bracket-section"

type BracketViewProps = {
  initialBracketMatches: RawBracketMatch[]
  teams: TeamInfo[]
  eventId: string
}

export function BracketView({
  initialBracketMatches,
  teams,
  eventId,
}: BracketViewProps) {
  const [bracketMatches, setBracketMatches] = useState(initialBracketMatches)

  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams],
  )

  const organizedBracket = useMemo(
    () => organizeBracketData(bracketMatches, teamMap),
    [bracketMatches, teamMap],
  )

  const onBracketMatchUpdate = useCallback(
    (matchId: string, newRow: RawBracketMatch) => {
      setBracketMatches((prev) => {
        const exists = prev.some((m) => m.id === matchId)
        if (!exists) {
          // INSERT を取り逃した場合のフォールバック
          return [...prev, newRow]
        }
        return prev.map((m) => (m.id === matchId ? newRow : m))
      })
    },
    [],
  )

  const onBracketMatchInsert = useCallback((newRow: RawBracketMatch) => {
    setBracketMatches((prev) => [...prev, newRow])
  }, [])

  const onBracketMatchDelete = useCallback((matchId: string) => {
    setBracketMatches((prev) => prev.filter((m) => m.id !== matchId))
  }, [])

  useBracketRealtime({
    eventId,
    onBracketMatchUpdate,
    onBracketMatchInsert,
    onBracketMatchDelete,
  })

  if (bracketMatches.length === 0) {
    return (
      <div className="rich-card p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
          <Trophy className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm">
          トーナメント表はまだ作成されていません
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BracketSection
        title="Winners Bracket"
        rounds={organizedBracket.winners}
        colorClass="amber"
      />
      <BracketSection
        title="Losers Bracket"
        rounds={organizedBracket.losers}
        colorClass="blue"
      />
      <BracketSection
        title="Grand Final"
        rounds={organizedBracket.grandFinal}
        colorClass="purple"
      />
    </div>
  )
}
