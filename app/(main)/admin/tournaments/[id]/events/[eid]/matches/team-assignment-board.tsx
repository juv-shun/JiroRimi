"use client"

import { useState, useCallback, useId } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useDroppable } from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { User, Play, GripVertical } from "lucide-react"

import { ROLE_LABELS, ROLE_BADGE_COLORS } from "@/lib/types/profile"
import type { Role } from "@/lib/types/profile"
import type {
  ParticipantInfo,
  MatchSlot,
  ExistingRound,
} from "@/lib/types/match"
import { TeamAssignmentConfirmModal } from "./team-assignment-confirm-modal"

type TeamAssignmentBoardProps = {
  participants: ParticipantInfo[]
  matchCount: number
  roundNumber: number
  eventId: string
  existingRounds: ExistingRound[]
  standingsMap: Record<string, { wins: number; losses: number }>
  onSuccess: () => void
}

// --- ユーティリティ ---

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

type ContainerInfo =
  | { type: "unassigned" }
  | { type: "team"; matchIdx: number; team: "teamA" | "teamB" }

function parseContainerId(id: string): ContainerInfo | null {
  if (id === "unassigned") return { type: "unassigned" }
  const match = id.match(/^match-(\d+)-(team_a|team_b)$/)
  if (!match) return null
  return {
    type: "team",
    matchIdx: Number(match[1]),
    team: match[2] === "team_a" ? "teamA" : "teamB",
  }
}

function findContainer(
  profileId: string,
  unassigned: ParticipantInfo[],
  matches: MatchSlot[],
): ContainerInfo | null {
  if (unassigned.some((p) => p.profileId === profileId)) {
    return { type: "unassigned" }
  }
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].teamA.some((p) => p.profileId === profileId)) {
      return { type: "team", matchIdx: i, team: "teamA" }
    }
    if (matches[i].teamB.some((p) => p.profileId === profileId)) {
      return { type: "team", matchIdx: i, team: "teamB" }
    }
  }
  return null
}

function getParticipant(
  profileId: string,
  unassigned: ParticipantInfo[],
  matches: MatchSlot[],
): ParticipantInfo | null {
  const found = unassigned.find((p) => p.profileId === profileId)
  if (found) return found
  for (const m of matches) {
    const fromA = m.teamA.find((p) => p.profileId === profileId)
    if (fromA) return fromA
    const fromB = m.teamB.find((p) => p.profileId === profileId)
    if (fromB) return fromB
  }
  return null
}

// --- サブコンポーネント ---

function RoleBadge({
  role,
  priority,
}: {
  role: Role
  priority: 1 | 2 | 3
}) {
  const colorClass = ROLE_BADGE_COLORS[role]
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight ${colorClass} ${
        priority === 1 ? "ring-1 ring-current/20" : "opacity-60"
      }`}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

function PlayerCard({
  participant,
  isDragging,
  wins,
  losses,
}: {
  participant: ParticipantInfo
  isDragging?: boolean
  wins?: number
  losses?: number
}) {
  const roles = [
    { role: participant.firstRole, priority: 1 as const },
    { role: participant.secondRole, priority: 2 as const },
    { role: participant.thirdRole, priority: 3 as const },
  ].filter((r): r is { role: Role; priority: 1 | 2 | 3 } => r.role !== null)

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-border shadow-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {participant.avatarUrl &&
      isAllowedAvatarUrl(participant.avatarUrl) ? (
        <img
          src={participant.avatarUrl}
          alt=""
          loading="lazy"
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">
          {participant.playerName ?? "（未設定）"}
        </p>
        {roles.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {roles.map((r) => (
              <RoleBadge key={r.role} role={r.role} priority={r.priority} />
            ))}
          </div>
        )}
        {(wins ?? 0) + (losses ?? 0) > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5">{wins ?? 0}W {losses ?? 0}L</p>
        )}
      </div>
    </div>
  )
}

function DraggablePlayer({
  participant,
  wins,
  losses,
}: {
  participant: ParticipantInfo
  wins?: number
  losses?: number
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${participant.profileId}`,
    data: { type: "player" },
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-none">
      <PlayerCard participant={participant} isDragging={isDragging} wins={wins} losses={losses} />
    </div>
  )
}

function DroppableContainer({
  id,
  children,
  label,
  count,
  maxCount,
}: {
  id: string
  children: React.ReactNode
  label: string
  count: number
  maxCount?: number
}) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed p-3 min-h-[60px] transition-colors ${
        isOver
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-gray-50/50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        {maxCount !== undefined && (
          <span
            className={`text-xs font-medium ${
              count >= maxCount ? "text-green-600" : "text-gray-400"
            }`}
          >
            {count}/{maxCount}
          </span>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function DraggableTeamContainer({
  droppableId,
  draggableId,
  matchIdx,
  team,
  children,
  label,
  count,
  maxCount,
}: {
  droppableId: string
  draggableId: string
  matchIdx: number
  team: "teamA" | "teamB"
  children: React.ReactNode
  label: string
  count: number
  maxCount?: number
}) {
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: droppableId,
  })
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    setActivatorNodeRef,
    isDragging,
  } = useDraggable({
    id: draggableId,
    data: { type: "team", matchIdx, team },
  })

  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      setDroppableRef(node)
      setDraggableRef(node)
    },
    [setDroppableRef, setDraggableRef],
  )

  return (
    <div
      ref={combinedRef}
      className={`rounded-xl border-2 border-dashed p-3 min-h-[60px] transition-colors ${
        isDragging
          ? "opacity-50 border-primary/30 bg-primary/5"
          : isOver
            ? "border-primary/50 bg-primary/5"
            : "border-border bg-gray-50/50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            className="touch-none cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <p className="text-xs font-semibold text-gray-500">{label}</p>
        </div>
        {maxCount !== undefined && (
          <span
            className={`text-xs font-medium ${
              count >= maxCount ? "text-green-600" : "text-gray-400"
            }`}
          >
            {count}/{maxCount}
          </span>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function TeamDragPreview({
  team,
  label,
}: {
  team: ParticipantInfo[]
  label: string
}) {
  return (
    <div className="w-56 rounded-xl border-2 border-primary/50 bg-white p-3 shadow-lg">
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      {team.length === 0 ? (
        <p className="text-xs text-gray-400">（空）</p>
      ) : (
        <div className="space-y-1">
          {team.map((p) => (
            <div key={p.profileId} className="flex items-center gap-2">
              {p.avatarUrl && isAllowedAvatarUrl(p.avatarUrl) ? (
                <img
                  src={p.avatarUrl}
                  alt=""
                  loading="lazy"
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 text-gray-400" />
                </div>
              )}
              <span className="text-xs text-gray-700 truncate">
                {p.playerName ?? "（未設定）"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- メインコンポーネント ---

export function TeamAssignmentBoard({
  participants,
  matchCount,
  roundNumber,
  eventId,
  existingRounds,
  standingsMap,
  onSuccess,
}: TeamAssignmentBoardProps) {
  const dndId = useId()

  // 前ラウンドの配置がある場合はデフォルト値として使う
  const prevRound = existingRounds.find((r) => r.roundNumber === roundNumber - 1)
  const participantIds = new Set(participants.map((p) => p.profileId))

  const initialMatches: MatchSlot[] = prevRound
    ? Array.from({ length: matchCount }, (_, i) => {
        const prev = prevRound.matches[i]
        return prev
          ? {
              teamA: prev.teamA.filter((p) => participantIds.has(p.profileId)),
              teamB: prev.teamB.filter((p) => participantIds.has(p.profileId)),
            }
          : { teamA: [], teamB: [] }
      })
    : Array.from({ length: matchCount }, () => ({ teamA: [], teamB: [] }))

  const assignedIds = new Set(
    initialMatches.flatMap((m) => [
      ...m.teamA.map((p) => p.profileId),
      ...m.teamB.map((p) => p.profileId),
    ]),
  )
  const initialUnassigned = participants.filter((p) => !assignedIds.has(p.profileId))

  const [unassigned, setUnassigned] = useState<ParticipantInfo[]>(initialUnassigned)
  const [matches, setMatches] = useState<MatchSlot[]>(initialMatches)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  type ActiveDrag =
    | { type: "player"; participant: ParticipantInfo }
    | { type: "team"; matchIdx: number; team: "teamA" | "teamB" }
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current
      if (
        data?.type === "team" &&
        typeof data.matchIdx === "number" &&
        data.matchIdx >= 0 &&
        data.matchIdx < matches.length &&
        (data.team === "teamA" || data.team === "teamB")
      ) {
        setActiveDrag({
          type: "team",
          matchIdx: data.matchIdx,
          team: data.team,
        })
      } else {
        const profileId = (event.active.id as string).replace("player-", "")
        const participant = getParticipant(profileId, unassigned, matches)
        if (participant) {
          setActiveDrag({ type: "player", participant })
        }
      }
    },
    [unassigned, matches],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const currentDrag = activeDrag
      setActiveDrag(null)
      const { over } = event
      if (!over || !currentDrag) return

      if (currentDrag.type === "player") {
        const activeId = currentDrag.participant.profileId

        let overContainerId = over.id as string
        if (overContainerId.startsWith("player-")) {
          const overProfileId = overContainerId.replace("player-", "")
          const container = findContainer(overProfileId, unassigned, matches)
          if (!container) return
          overContainerId =
            container.type === "unassigned"
              ? "unassigned"
              : `match-${container.matchIdx}-${container.team === "teamA" ? "team_a" : "team_b"}`
        }
        const teamDragMatch = overContainerId.match(
          /^team-(\d+)-(teamA|teamB)$/,
        )
        if (teamDragMatch) {
          const idx = teamDragMatch[1]
          const side = teamDragMatch[2] === "teamA" ? "team_a" : "team_b"
          overContainerId = `match-${idx}-${side}`
        }

        const sourceContainer = findContainer(activeId, unassigned, matches)
        const targetContainer = parseContainerId(overContainerId)
        if (!sourceContainer || !targetContainer) return

        if (
          sourceContainer.type === targetContainer.type &&
          (sourceContainer.type === "unassigned" ||
            (sourceContainer.type === "team" &&
              targetContainer.type === "team" &&
              sourceContainer.matchIdx === targetContainer.matchIdx &&
              sourceContainer.team === targetContainer.team))
        ) {
          return
        }

        if (targetContainer.type === "team") {
          const targetTeam =
            matches[targetContainer.matchIdx][targetContainer.team]
          if (targetTeam.length >= 5) return
        }

        const participant = getParticipant(activeId, unassigned, matches)
        if (!participant) return

        const nextUnassigned = unassigned.filter(
          (p) => p.profileId !== activeId,
        )
        const nextMatches = matches.map((m) => ({
          teamA: m.teamA.filter((p) => p.profileId !== activeId),
          teamB: m.teamB.filter((p) => p.profileId !== activeId),
        }))

        if (targetContainer.type === "unassigned") {
          nextUnassigned.push(participant)
        } else {
          nextMatches[targetContainer.matchIdx] = {
            ...nextMatches[targetContainer.matchIdx],
            [targetContainer.team]: [
              ...nextMatches[targetContainer.matchIdx][targetContainer.team],
              participant,
            ],
          }
        }

        setUnassigned(nextUnassigned)
        setMatches(nextMatches)
      } else {
        const { matchIdx: srcMatchIdx, team: srcTeam } = currentDrag

        let targetMatchIdx: number | null = null
        let targetTeam: "teamA" | "teamB" | null = null

        const overId = over.id as string

        const droppableMatch = overId.match(/^match-(\d+)-(team_a|team_b)$/)
        if (droppableMatch) {
          targetMatchIdx = Number(droppableMatch[1])
          targetTeam =
            droppableMatch[2] === "team_a" ? "teamA" : "teamB"
        }

        const draggableMatch = overId.match(/^team-(\d+)-(teamA|teamB)$/)
        if (draggableMatch) {
          targetMatchIdx = Number(draggableMatch[1])
          targetTeam = draggableMatch[2] as "teamA" | "teamB"
        }

        if (overId.startsWith("player-")) {
          const overProfileId = overId.replace("player-", "")
          const container = findContainer(overProfileId, unassigned, matches)
          if (container?.type === "team") {
            targetMatchIdx = container.matchIdx
            targetTeam = container.team
          }
        }

        if (
          targetMatchIdx === null ||
          targetTeam === null ||
          targetMatchIdx < 0 ||
          targetMatchIdx >= matches.length
        )
          return

        if (srcMatchIdx === targetMatchIdx && srcTeam === targetTeam) return

        const nextMatches = matches.map((m) => ({
          teamA: [...m.teamA],
          teamB: [...m.teamB],
        }))
        const srcMembers = nextMatches[srcMatchIdx][srcTeam]
        const tgtMembers = nextMatches[targetMatchIdx][targetTeam]
        nextMatches[srcMatchIdx][srcTeam] = tgtMembers
        nextMatches[targetMatchIdx][targetTeam] = srcMembers

        setMatches(nextMatches)
      }
    },
    [activeDrag, unassigned, matches],
  )

  const allAssigned = unassigned.length === 0

  return (
    <>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* 未配置エリア */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              未配置（{unassigned.length}人）
            </h3>
            <DroppableContainer
              id="unassigned"
              label="ここにドロップで未配置に戻す"
              count={unassigned.length}
            >
              {unassigned.map((p) => (
                <DraggablePlayer key={p.profileId} participant={p} wins={standingsMap[p.profileId]?.wins} losses={standingsMap[p.profileId]?.losses} />
              ))}
            </DroppableContainer>
          </div>

          {/* マッチ枠エリア */}
          <div className="space-y-4">
            {matches.map((match, idx) => (
              <div
                key={`match-${idx}`}
                className="bg-white rounded-2xl shadow-sm border border-border p-4"
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  マッチ {idx + 1}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <DraggableTeamContainer
                    droppableId={`match-${idx}-team_a`}
                    draggableId={`team-${idx}-teamA`}
                    matchIdx={idx}
                    team="teamA"
                    label="Team A"
                    count={match.teamA.length}
                    maxCount={5}
                  >
                    {match.teamA.map((p) => (
                      <DraggablePlayer key={p.profileId} participant={p} wins={standingsMap[p.profileId]?.wins} losses={standingsMap[p.profileId]?.losses} />
                    ))}
                    {match.teamA.length < 5 &&
                      Array.from({ length: 5 - match.teamA.length }).map(
                        (_, i) => (
                          <div
                            key={`placeholder-a-${idx}-${i}`}
                            className="h-12 rounded-lg border border-dashed border-gray-200 flex items-center justify-center"
                          >
                            <span className="text-xs text-gray-300">
                              空き
                            </span>
                          </div>
                        ),
                      )}
                  </DraggableTeamContainer>
                  <DraggableTeamContainer
                    droppableId={`match-${idx}-team_b`}
                    draggableId={`team-${idx}-teamB`}
                    matchIdx={idx}
                    team="teamB"
                    label="Team B"
                    count={match.teamB.length}
                    maxCount={5}
                  >
                    {match.teamB.map((p) => (
                      <DraggablePlayer key={p.profileId} participant={p} wins={standingsMap[p.profileId]?.wins} losses={standingsMap[p.profileId]?.losses} />
                    ))}
                    {match.teamB.length < 5 &&
                      Array.from({ length: 5 - match.teamB.length }).map(
                        (_, i) => (
                          <div
                            key={`placeholder-b-${idx}-${i}`}
                            className="h-12 rounded-lg border border-dashed border-gray-200 flex items-center justify-center"
                          >
                            <span className="text-xs text-gray-300">
                              空き
                            </span>
                          </div>
                        ),
                      )}
                  </DraggableTeamContainer>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeDrag?.type === "player" ? (
            <PlayerCard participant={activeDrag.participant} wins={standingsMap[activeDrag.participant.profileId]?.wins} losses={standingsMap[activeDrag.participant.profileId]?.losses} />
          ) : activeDrag?.type === "team" ? (
            <TeamDragPreview
              team={matches[activeDrag.matchIdx][activeDrag.team]}
              label={activeDrag.team === "teamA" ? "Team A" : "Team B"}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* フッター（sticky bottom） */}
      <div className="sticky bottom-0 mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-t border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500">
            未配置:{" "}
            <span
              className={`font-semibold ${
                unassigned.length === 0 ? "text-green-600" : "text-primary"
              }`}
            >
              {unassigned.length}人
            </span>
          </p>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={!allAssigned}
            className="glow-button px-6 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            試合開始
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <TeamAssignmentConfirmModal
          matches={matches}
          roundNumber={roundNumber}
          eventId={eventId}
          onClose={() => setShowConfirmModal(false)}
          onSuccess={onSuccess}
        />
      )}
    </>
  )
}
