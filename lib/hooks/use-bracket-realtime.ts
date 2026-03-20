"use client"

import { useEffect, useRef } from "react"

import { createClient } from "@/lib/supabase/client"
import type { RawBracketMatch } from "@/lib/types/bracket"

type UseBracketRealtimeOptions = {
  eventId: string
  onBracketMatchUpdate: (matchId: string, newRow: RawBracketMatch) => void
  onBracketMatchInsert: (newRow: RawBracketMatch) => void
}

export function useBracketRealtime({
  eventId,
  onBracketMatchUpdate,
  onBracketMatchInsert,
}: UseBracketRealtimeOptions) {
  const onUpdateRef = useRef(onBracketMatchUpdate)
  const onInsertRef = useRef(onBracketMatchInsert)

  useEffect(() => {
    onUpdateRef.current = onBracketMatchUpdate
  }, [onBracketMatchUpdate])
  useEffect(() => {
    onInsertRef.current = onBracketMatchInsert
  }, [onBracketMatchInsert])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`bracket_matches:event:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bracket_matches",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as RawBracketMatch
          onUpdateRef.current(row.id, row)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bracket_matches",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as RawBracketMatch
          onInsertRef.current(row)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])
}
