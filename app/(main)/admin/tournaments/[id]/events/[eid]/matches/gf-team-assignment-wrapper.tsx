"use client"

import { useRouter } from "next/navigation"

import type { ParticipantInfo, RankedPlayerStanding } from "@/lib/types/match"
import { GfTeamAssignmentBoard } from "./gf-team-assignment-board"

type GfTeamAssignmentWrapperProps = {
  participants: ParticipantInfo[]
  eventId: string
  rankings: RankedPlayerStanding[]
}

export function GfTeamAssignmentWrapper({
  participants,
  eventId,
  rankings,
}: GfTeamAssignmentWrapperProps) {
  const router = useRouter()

  return (
    <GfTeamAssignmentBoard
      participants={participants}
      eventId={eventId}
      rankings={rankings}
      onSuccess={() => router.refresh()}
    />
  )
}
