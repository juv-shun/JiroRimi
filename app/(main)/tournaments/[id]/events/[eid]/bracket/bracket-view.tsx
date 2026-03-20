"use client"

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
      setBracketMatches((prev) =>
        prev.map((m) => (m.id === matchId ? newRow : m)),
      )
    },
    [],
  )

  const onBracketMatchInsert = useCallback((newRow: RawBracketMatch) => {
    setBracketMatches((prev) => [...prev, newRow])
  }, [])

  useBracketRealtime({
    eventId,
    onBracketMatchUpdate,
    onBracketMatchInsert,
  })

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
