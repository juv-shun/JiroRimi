"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { GripVertical, Play, User } from "lucide-react"
import { useCallback, useId, useState } from "react"

import { Toast } from "@/app/components/toast"
import type { ParticipantInfo, RankedPlayerStanding } from "@/lib/types/match"
import type { GfTeamSlot } from "@/lib/types/gf-team"
import {
  DraggablePlayer,
  DroppableContainer,
  isAllowedAvatarUrl,
  PlayerCard,
} from "./team-assignment-board"
import { GfTeamAssignmentConfirmModal } from "./gf-team-assignment-confirm-modal"

type GfTeamAssignmentBoardProps = {
  participants: ParticipantInfo[]
  eventId: string
  rankings: RankedPlayerStanding[]
  onSuccess: () => void
}

const TEAM_COUNT = 4
const MEMBERS_PER_TEAM = 5
const DEFAULT_TEAM_NAMES = ["チーム1", "チーム2", "チーム3", "チーム4"]

type GfContainerInfo =
  | { type: "unassigned" }
  | { type: "team"; teamIdx: number }

function parseGfContainerId(id: string): GfContainerInfo | null {
  if (id === "unassigned") return { type: "unassigned" }
  const match = id.match(/^gf-team-(\d+)$/)
  if (!match) return null
  return { type: "team", teamIdx: Number(match[1]) }
}

function findGfContainer(
  profileId: string,
  unassigned: ParticipantInfo[],
  teams: GfTeamSlot[],
): GfContainerInfo | null {
  if (unassigned.some((p) => p.profileId === profileId)) {
    return { type: "unassigned" }
  }
  for (let i = 0; i < teams.length; i++) {
    if (teams[i].members.some((p) => p.profileId === profileId)) {
      return { type: "team", teamIdx: i }
    }
  }
  return null
}

function getGfParticipant(
  profileId: string,
  unassigned: ParticipantInfo[],
  teams: GfTeamSlot[],
): ParticipantInfo | null {
  const found = unassigned.find((p) => p.profileId === profileId)
  if (found) return found
  for (const t of teams) {
    const member = t.members.find((p) => p.profileId === profileId)
    if (member) return member
  }
  return null
}

// Draggableなチームコンテナ（チーム丸ごとスワップ対応）
function GfDraggableTeamContainer({
  droppableId,
  draggableId,
  teamIdx,
  children,
  label,
  count,
  maxCount,
  teamName,
  onTeamNameChange,
}: {
  droppableId: string
  draggableId: string
  teamIdx: number
  children: React.ReactNode
  label: string
  count: number
  maxCount: number
  teamName: string
  onTeamNameChange: (name: string) => void
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
    data: { type: "team", teamIdx },
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
        <span
          className={`text-xs font-medium ${
            count >= maxCount ? "text-green-600" : "text-gray-400"
          }`}
        >
          {count}/{maxCount}
        </span>
      </div>
      <input
        type="text"
        value={teamName}
        onChange={(e) => onTeamNameChange(e.target.value)}
        maxLength={20}
        className="w-full text-sm font-medium text-gray-900 bg-white border border-border rounded-lg px-2 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        placeholder="チーム名を入力"
      />
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

// チームドラッグのプレビュー
function GfTeamDragPreview({
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

export function GfTeamAssignmentBoard({
  participants,
  eventId,
  rankings,
  onSuccess,
}: GfTeamAssignmentBoardProps) {
  const dndId = useId()

  // ランキングマップ
  const rankMap = new Map<string, RankedPlayerStanding>()
  for (const r of rankings) {
    rankMap.set(r.profileId, r)
  }

  const initialTeams: GfTeamSlot[] = Array.from(
    { length: TEAM_COUNT },
    (_, i) => ({
      seed: i + 1,
      name: DEFAULT_TEAM_NAMES[i],
      members: [],
    }),
  )

  const [unassigned, setUnassigned] =
    useState<ParticipantInfo[]>(participants)
  const [teams, setTeams] = useState<GfTeamSlot[]>(initialTeams)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [toastState, setToastState] = useState<{
    show: boolean
    message: string
    type: "success" | "error"
    isExiting: boolean
  }>({ show: false, message: "", type: "success", isExiting: false })

  type ActiveDrag =
    | { type: "player"; participant: ParticipantInfo }
    | { type: "team"; teamIdx: number }
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current
      if (data?.type === "team" && typeof data.teamIdx === "number") {
        setActiveDrag({ type: "team", teamIdx: data.teamIdx })
      } else {
        const profileId = (event.active.id as string).replace("player-", "")
        const participant = getGfParticipant(profileId, unassigned, teams)
        if (participant) {
          setActiveDrag({ type: "player", participant })
        }
      }
    },
    [unassigned, teams],
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
        // プレイヤーの上にドロップした場合、そのプレイヤーのコンテナを取得
        if (overContainerId.startsWith("player-")) {
          const overProfileId = overContainerId.replace("player-", "")
          const container = findGfContainer(overProfileId, unassigned, teams)
          if (!container) return
          overContainerId =
            container.type === "unassigned"
              ? "unassigned"
              : `gf-team-${container.teamIdx}`
        }
        // team draggable IDにドロップした場合
        const teamDragMatch = overContainerId.match(/^gf-drag-team-(\d+)$/)
        if (teamDragMatch) {
          overContainerId = `gf-team-${teamDragMatch[1]}`
        }

        const sourceContainer = findGfContainer(activeId, unassigned, teams)
        const targetContainer = parseGfContainerId(overContainerId)
        if (!sourceContainer || !targetContainer) return

        // 同じコンテナ内の移動は無視
        if (
          sourceContainer.type === targetContainer.type &&
          (sourceContainer.type === "unassigned" ||
            (sourceContainer.type === "team" &&
              targetContainer.type === "team" &&
              sourceContainer.teamIdx === targetContainer.teamIdx))
        ) {
          return
        }

        // チームの人数制限チェック
        if (targetContainer.type === "team") {
          if (teams[targetContainer.teamIdx].members.length >= MEMBERS_PER_TEAM) return
        }

        const participant = getGfParticipant(activeId, unassigned, teams)
        if (!participant) return

        // ソースから削除
        const nextUnassigned = unassigned.filter((p) => p.profileId !== activeId)
        const nextTeams = teams.map((t) => ({
          ...t,
          members: t.members.filter((p) => p.profileId !== activeId),
        }))

        // ターゲットに追加
        if (targetContainer.type === "unassigned") {
          nextUnassigned.push(participant)
        } else {
          nextTeams[targetContainer.teamIdx] = {
            ...nextTeams[targetContainer.teamIdx],
            members: [
              ...nextTeams[targetContainer.teamIdx].members,
              participant,
            ],
          }
        }

        setUnassigned(nextUnassigned)
        setTeams(nextTeams)
      } else {
        // チーム丸ごとスワップ
        const { teamIdx: srcIdx } = currentDrag
        const overId = over.id as string

        let targetIdx: number | null = null
        const droppableMatch = overId.match(/^gf-team-(\d+)$/)
        if (droppableMatch) targetIdx = Number(droppableMatch[1])
        const draggableMatch = overId.match(/^gf-drag-team-(\d+)$/)
        if (draggableMatch) targetIdx = Number(draggableMatch[1])
        if (overId.startsWith("player-")) {
          const overProfileId = overId.replace("player-", "")
          const container = findGfContainer(overProfileId, unassigned, teams)
          if (container?.type === "team") targetIdx = container.teamIdx
        }

        if (targetIdx === null || targetIdx === srcIdx) return
        if (targetIdx < 0 || targetIdx >= TEAM_COUNT) return

        const nextTeams = [...teams]
        const srcMembers = nextTeams[srcIdx].members
        const tgtMembers = nextTeams[targetIdx].members
        nextTeams[srcIdx] = { ...nextTeams[srcIdx], members: tgtMembers }
        nextTeams[targetIdx] = { ...nextTeams[targetIdx], members: srcMembers }
        setTeams(nextTeams)
      }
    },
    [activeDrag, unassigned, teams],
  )

  const handleTeamNameChange = useCallback(
    (idx: number, name: string) => {
      setTeams((prev) =>
        prev.map((t, i) => (i === idx ? { ...t, name } : t)),
      )
    },
    [],
  )

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToastState({ show: true, message, type, isExiting: false })
      setTimeout(() => setToastState((s) => ({ ...s, isExiting: true })), 2500)
      setTimeout(
        () =>
          setToastState({
            show: false,
            message: "",
            type: "success",
            isExiting: false,
          }),
        3000,
      )
    },
    [],
  )

  const allAssigned = unassigned.length === 0
  const allTeamsNamed = teams.every((t) => t.name.trim().length > 0)
  const canConfirm = allAssigned && allTeamsNamed

  const getRankLabel = (profileId: string) => {
    const r = rankMap.get(profileId)
    return r ? `#${r.rank}` : undefined
  }

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
              {unassigned.map((p) => {
                const r = rankMap.get(p.profileId)
                return (
                  <DraggablePlayer
                    key={p.profileId}
                    participant={p}
                    wins={r?.wins}
                    losses={r?.losses}
                    rankLabel={getRankLabel(p.profileId)}
                  />
                )
              })}
            </DroppableContainer>
          </div>

          {/* チーム枠エリア */}
          <div className="space-y-4">
            {teams.map((team, idx) => (
              <div
                key={`gf-team-${team.seed}`}
                className="bg-white rounded-2xl shadow-sm border border-border p-4"
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Seed {team.seed}
                </h3>
                <GfDraggableTeamContainer
                  droppableId={`gf-team-${idx}`}
                  draggableId={`gf-drag-team-${idx}`}
                  teamIdx={idx}
                  label={`Seed ${team.seed}`}
                  count={team.members.length}
                  maxCount={MEMBERS_PER_TEAM}
                  teamName={team.name}
                  onTeamNameChange={(name) => handleTeamNameChange(idx, name)}
                >
                  {team.members.map((p) => {
                    const r = rankMap.get(p.profileId)
                    return (
                      <DraggablePlayer
                        key={p.profileId}
                        participant={p}
                        wins={r?.wins}
                        losses={r?.losses}
                        rankLabel={getRankLabel(p.profileId)}
                      />
                    )
                  })}
                  {team.members.length < MEMBERS_PER_TEAM &&
                    Array.from({
                      length: MEMBERS_PER_TEAM - team.members.length,
                    }).map((_, i) => (
                      <div
                        key={`placeholder-${team.seed}-${i}`}
                        className="h-12 rounded-lg border border-dashed border-gray-200 flex items-center justify-center"
                      >
                        <span className="text-xs text-gray-300">空き</span>
                      </div>
                    ))}
                </GfDraggableTeamContainer>
              </div>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeDrag?.type === "player" ? (
            <PlayerCard
              participant={activeDrag.participant}
              wins={rankMap.get(activeDrag.participant.profileId)?.wins}
              losses={rankMap.get(activeDrag.participant.profileId)?.losses}
              rankLabel={getRankLabel(activeDrag.participant.profileId)}
            />
          ) : activeDrag?.type === "team" ? (
            <GfTeamDragPreview
              team={teams[activeDrag.teamIdx].members}
              label={teams[activeDrag.teamIdx].name || `Seed ${activeDrag.teamIdx + 1}`}
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
            disabled={!canConfirm}
            className="glow-button px-6 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            チーム編成を確定
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <GfTeamAssignmentConfirmModal
          teams={teams}
          eventId={eventId}
          onClose={() => setShowConfirmModal(false)}
          onSuccess={onSuccess}
        />
      )}

      <Toast
        message={toastState.message}
        type={toastState.type}
        show={toastState.show}
        isExiting={toastState.isExiting}
      />
    </>
  )
}
