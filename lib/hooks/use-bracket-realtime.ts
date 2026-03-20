"use client"

import { useEffect, useRef } from "react"

import { createClient } from "@/lib/supabase/client"
import type { RawBracketMatch } from "@/lib/types/bracket"

type UseBracketRealtimeOptions = {
  eventId: string
  onBracketMatchUpdate: (matchId: string, newRow: RawBracketMatch) => void
  onBracketMatchInsert: (newRow: RawBracketMatch) => void
  onBracketMatchDelete?: (matchId: string) => void
}

export function useBracketRealtime({
  eventId,
  onBracketMatchUpdate,
  onBracketMatchInsert,
  onBracketMatchDelete,
}: UseBracketRealtimeOptions) {
  const onUpdateRef = useRef(onBracketMatchUpdate)
  const onInsertRef = useRef(onBracketMatchInsert)
  const onDeleteRef = useRef(onBracketMatchDelete)

  useEffect(() => {
    onUpdateRef.current = onBracketMatchUpdate
  }, [onBracketMatchUpdate])
  useEffect(() => {
    onInsertRef.current = onBracketMatchInsert
  }, [onBracketMatchInsert])
  useEffect(() => {
    onDeleteRef.current = onBracketMatchDelete
  }, [onBracketMatchDelete])

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
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "bracket_matches",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const oldRow = payload.old as { id: string }
          onDeleteRef.current?.(oldRow.id)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])
}
