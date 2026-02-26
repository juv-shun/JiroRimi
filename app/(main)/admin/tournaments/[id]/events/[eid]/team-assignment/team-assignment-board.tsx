"use client"

import { useState, useCallback } from "react"
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
import { User, Check } from "lucide-react"

import { ROLE_LABELS } from "@/lib/types/profile"
import type { Role } from "@/lib/types/profile"
import type { ParticipantInfo, MatchSlot } from "@/lib/types/match"
import { ConfirmModal } from "./confirm-modal"

type TeamAssignmentBoardProps = {
  participants: ParticipantInfo[]
  matchCount: number
  roundNumber: number
  eventId: string
  tournamentId: string
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

const ROLE_BADGE_COLORS: Record<Role, string> = {
  top_carry: "bg-purple-100 text-purple-700",
  bot_carry: "bg-red-100 text-red-700",
  mid: "bg-blue-100 text-blue-700",
  tank: "bg-green-100 text-green-700",
  support: "bg-yellow-100 text-yellow-700",
}

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
}: {
  participant: ParticipantInfo
  isDragging?: boolean
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
      </div>
    </div>
  )
}

function DraggablePlayer({
  participant,
}: {
  participant: ParticipantInfo
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${participant.profileId}`,
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-none">
      <PlayerCard participant={participant} isDragging={isDragging} />
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

// --- メインコンポーネント ---

export function TeamAssignmentBoard({
  participants,
  matchCount,
  roundNumber,
  eventId,
}: TeamAssignmentBoardProps) {
  const [unassigned, setUnassigned] = useState<ParticipantInfo[]>(participants)
  const [matches, setMatches] = useState<MatchSlot[]>(
    Array.from({ length: matchCount }, () => ({ teamA: [], teamB: [] })),
  )
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null)
      const { active, over } = event
      if (!over) return

      const activeId = (active.id as string).replace("player-", "")

      // ドロップ先コンテナを特定
      let overContainerId = over.id as string
      // ドロップ先がプレイヤーの場合、そのプレイヤーが属するコンテナを探す
      if (overContainerId.startsWith("player-")) {
        const overProfileId = overContainerId.replace("player-", "")
        const container = findContainer(overProfileId, unassigned, matches)
        if (!container) return
        overContainerId =
          container.type === "unassigned"
            ? "unassigned"
            : `match-${container.matchIdx}-${container.team === "teamA" ? "team_a" : "team_b"}`
      }

      const sourceContainer = findContainer(activeId, unassigned, matches)
      const targetContainer = parseContainerId(overContainerId)
      if (!sourceContainer || !targetContainer) return

      // 同一コンテナ → noop
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

      // ドロップ先チームが5人 → noop
      if (targetContainer.type === "team") {
        const targetTeam =
          matches[targetContainer.matchIdx][targetContainer.team]
        if (targetTeam.length >= 5) return
      }

      const participant = getParticipant(activeId, unassigned, matches)
      if (!participant) return

      // 次状態を計算
      const nextUnassigned = unassigned.filter(
        (p) => p.profileId !== activeId,
      )
      const nextMatches = matches.map((m) => ({
        teamA: m.teamA.filter((p) => p.profileId !== activeId),
        teamB: m.teamB.filter((p) => p.profileId !== activeId),
      }))

      // ドロップ先に追加
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
    },
    [unassigned, matches],
  )

  const activeParticipant = activeDragId
    ? getParticipant(
        activeDragId.replace("player-", ""),
        unassigned,
        matches,
      )
    : null

  const allAssigned = unassigned.length === 0

  const handleSuccess = () => {
    setShowConfirmModal(false)
    window.location.reload()
  }

  return (
    <>
      <DndContext
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
                <DraggablePlayer key={p.profileId} participant={p} />
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
                  <DroppableContainer
                    id={`match-${idx}-team_a`}
                    label="Team A"
                    count={match.teamA.length}
                    maxCount={5}
                  >
                    {match.teamA.map((p) => (
                      <DraggablePlayer key={p.profileId} participant={p} />
                    ))}
                    {match.teamA.length < 5 &&
                      Array.from({ length: 5 - match.teamA.length }).map(
                        (_, i) => (
                          <div
                            key={`placeholder-a-${idx}-${i}`}
                            className="h-12 rounded-lg border border-dashed border-gray-200 flex items-center justify-center"
                          >
                            <span className="text-xs text-gray-300">空き</span>
                          </div>
                        ),
                      )}
                  </DroppableContainer>
                  <DroppableContainer
                    id={`match-${idx}-team_b`}
                    label="Team B"
                    count={match.teamB.length}
                    maxCount={5}
                  >
                    {match.teamB.map((p) => (
                      <DraggablePlayer key={p.profileId} participant={p} />
                    ))}
                    {match.teamB.length < 5 &&
                      Array.from({ length: 5 - match.teamB.length }).map(
                        (_, i) => (
                          <div
                            key={`placeholder-b-${idx}-${i}`}
                            className="h-12 rounded-lg border border-dashed border-gray-200 flex items-center justify-center"
                          >
                            <span className="text-xs text-gray-300">空き</span>
                          </div>
                        ),
                      )}
                  </DroppableContainer>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeParticipant ? (
            <PlayerCard participant={activeParticipant} />
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
            <Check className="w-4 h-4" />
            編成を確定
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <ConfirmModal
          matches={matches}
          roundNumber={roundNumber}
          eventId={eventId}
          onClose={() => setShowConfirmModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
