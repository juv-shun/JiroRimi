"use client"

import { useEffect, useRef } from "react"

import { createClient } from "@/lib/supabase/client"
import type { MatchResult, MatchStatus, Vote } from "@/lib/types/match"

type UseMatchRealtimeOptions = {
  eventId: string
  matchIds: string[]
  onMatchUpdate: (
    matchId: string,
    changes: {
      lobbyNumber: string | null
      status: MatchStatus
      result: MatchResult
    },
  ) => void
  onParticipantUpdate: (
    matchId: string,
    profileId: string,
    vote: Vote | null,
  ) => void
  onUnknownMatch: () => void
}

export function useMatchRealtime({
  eventId,
  matchIds,
  onMatchUpdate,
  onParticipantUpdate,
  onUnknownMatch,
}: UseMatchRealtimeOptions) {
  // コールバックを ref で保持（useEffect の依存配列問題を回避）
  const onMatchUpdateRef = useRef(onMatchUpdate)
  const onParticipantUpdateRef = useRef(onParticipantUpdate)
  const onUnknownMatchRef = useRef(onUnknownMatch)

  useEffect(() => {
    onMatchUpdateRef.current = onMatchUpdate
  }, [onMatchUpdate])
  useEffect(() => {
    onParticipantUpdateRef.current = onParticipantUpdate
  }, [onParticipantUpdate])
  useEffect(() => {
    onUnknownMatchRef.current = onUnknownMatch
  }, [onUnknownMatch])

  // matchIds を Set で保持
  const matchIdsRef = useRef(new Set(matchIds))
  useEffect(() => {
    matchIdsRef.current = new Set(matchIds)
  }, [matchIds])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`matches:event:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            lobby_number: string | null
            status: string
            result: string | null
          }

          if (matchIdsRef.current.has(row.id)) {
            onMatchUpdateRef.current(row.id, {
              lobbyNumber: row.lobby_number,
              status: row.status as MatchStatus,
              result: (row.result as MatchResult) ?? null,
            })
          } else {
            onUnknownMatchRef.current()
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "match_participants",
        },
        (payload) => {
          const row = payload.new as {
            match_id: string
            profile_id: string
            vote: string | null
          }

          // 既知の matchId のみ処理、未知は無視
          if (matchIdsRef.current.has(row.match_id)) {
            onParticipantUpdateRef.current(
              row.match_id,
              row.profile_id,
              (row.vote as Vote | null) ?? null,
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])
}
