"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Clock, Play, Trophy, Shuffle } from "lucide-react"

import { Toast } from "@/app/components/toast"
import { useMatchRealtime } from "@/lib/hooks/use-match-realtime"
import type {
  AdminMatchForDisplay,
  AdminMatchParticipant,
  ExistingRound,
  MatchResult,
  ParticipantInfo,
} from "@/lib/types/match"
import { computeTentativeResult } from "@/lib/utils/match-result"
import { MatchCard } from "./match-card"
import { StandingsTable } from "./standings-table"
import { ConfirmModal } from "./confirm-modal"
import { TeamAssignmentBoard } from "./team-assignment-board"

type RoundState =
  | "team_assignment"
  | "waiting"
  | "in_progress"
  | "confirmed"
  | "future"

type RoundManagerProps = {
  matches: AdminMatchForDisplay[]
  totalRounds: number
  eventId: string
  tournamentId: string
  eventStatus: string
  participants: ParticipantInfo[]
  matchCount: number
  nextRoundNumber: number
  existingRounds: ExistingRound[]
  standingsMap: Record<string, { wins: number; losses: number }>
}

export function RoundManager({
  matches,
  totalRounds,
  eventId,
  tournamentId,
  eventStatus,
  participants,
  matchCount,
  nextRoundNumber,
  existingRounds,
  standingsMap,
}: RoundManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [matchData, setMatchData] = useState<AdminMatchForDisplay[]>(matches)

  // props 変更時にリセット
  useEffect(() => {
    setMatchData(matches)
  }, [matches])

  // ラウンドごとのマッチ整理
  const roundNumbers = [...new Set(matchData.map((m) => m.roundNumber))].sort((a, b) => a - b)

  // ラウンド状態判定（5状態）
  const getRoundState = (rn: number): RoundState => {
    const roundMatches = matchData.filter((m) => m.roundNumber === rn)

    if (roundMatches.length > 0) {
      if (roundMatches.every((m) => m.status === "confirmed"))
        return "confirmed"
      if (roundMatches.some((m) => m.status === "in_progress"))
        return "in_progress"
      return "waiting"
    }

    // マッチ未作成
    if (rn === 1) return "team_assignment"

    // 前ラウンドが confirmed かどうか
    const prevRoundMatches = matchData.filter((m) => m.roundNumber === rn - 1)
    if (
      prevRoundMatches.length > 0 &&
      prevRoundMatches.every((m) => m.status === "confirmed")
    ) {
      return "team_assignment"
    }

    return "future"
  }

  // デフォルト選択: in_progress → waiting → team_assignment → 最後のconfirmed → 1
  const defaultRound = (() => {
    for (let rn = 1; rn <= totalRounds; rn++) {
      if (getRoundState(rn) === "in_progress") return rn
    }
    for (let rn = 1; rn <= totalRounds; rn++) {
      if (getRoundState(rn) === "waiting") return rn
    }
    for (let rn = 1; rn <= totalRounds; rn++) {
      if (getRoundState(rn) === "team_assignment") return rn
    }
    // 最後のconfirmed
    const confirmedRounds = []
    for (let rn = 1; rn <= totalRounds; rn++) {
      if (getRoundState(rn) === "confirmed") confirmedRounds.push(rn)
    }
    if (confirmedRounds.length > 0)
      return confirmedRounds[confirmedRounds.length - 1]
    return 1
  })()

  const [selectedRound, setSelectedRound] = useState(defaultRound)
  const [results, setResults] = useState<Record<string, MatchResult>>({})
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"confirm" | "complete" | "start">("confirm")
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const currentRoundState = getRoundState(selectedRound)
  const currentMatches = matchData.filter(
    (m) => m.roundNumber === selectedRound,
  )

  // Realtime 購読
  const matchIds = useMemo(() => matchData.map((m) => m.matchId), [matchData])

  useMatchRealtime({
    eventId,
    matchIds,
    onMatchUpdate: (matchId, changes) => {
      setMatchData((prev) =>
        prev.map((m) =>
          m.matchId === matchId
            ? {
                ...m,
                lobbyNumber: changes.lobbyNumber,
                status: changes.status,
                result: changes.result,
              }
            : m,
        ),
      )
    },
    onParticipantUpdate: (matchId, profileId, vote) => {
      setMatchData((prev) =>
        prev.map((m) => {
          if (m.matchId !== matchId) return m
          const updateVote = (members: AdminMatchParticipant[]) =>
            members.map((p) =>
              p.profileId === profileId ? { ...p, vote } : p,
            )
          return {
            ...m,
            teamA: updateVote(m.teamA),
            teamB: updateVote(m.teamB),
          }
        }),
      )
    },
    onUnknownMatch: () => {
      router.refresh()
    },
  })

  // ラウンド切替時: 全リセット
  const prevRoundRef = useRef(selectedRound)
  useEffect(() => {
    const current = matchData.filter((m) => m.roundNumber === selectedRound)
    const isRoundChange = prevRoundRef.current !== selectedRound
    prevRoundRef.current = selectedRound

    if (isRoundChange) {
      const initial: Record<string, MatchResult> = {}
      for (const m of current) {
        if (m.result) {
          initial[m.matchId] = m.result
        } else {
          const tentative = computeTentativeResult(m.teamA, m.teamB)
          if (tentative === "team_a" || tentative === "team_b") {
            initial[m.matchId] = tentative
          }
        }
      }
      setResults(initial)
    } else {
      setResults((prev) => {
        const next = { ...prev }
        for (const m of current) {
          if (m.result) {
            next[m.matchId] = m.result
          } else if (!(m.matchId in prev)) {
            const tentative = computeTentativeResult(m.teamA, m.teamB)
            if (tentative === "team_a" || tentative === "team_b") {
              next[m.matchId] = tentative
            }
          }
        }
        return next
      })
    }
  }, [selectedRound, matchData])

  useEffect(() => {
    return () => {
      clearTimeout(exitTimerRef.current)
      clearTimeout(hideTimerRef.current)
    }
  }, [])

  const showToast = (message: string, type: "success" | "error") => {
    clearTimeout(exitTimerRef.current)
    clearTimeout(hideTimerRef.current)
    setToast({ message, type })
    setIsExiting(false)
    exitTimerRef.current = setTimeout(() => setIsExiting(true), 2500)
    hideTimerRef.current = setTimeout(() => {
      setToast(null)
      setIsExiting(false)
    }, 3000)
  }

  const handleResultChange = (matchId: string, result: MatchResult) => {
    setResults((prev) => ({ ...prev, [matchId]: result }))
  }

  // 試合開始
  const handleStartRound = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/events/${eventId}/matches/start`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ round_number: selectedRound }),
          },
        )
        const data = await res.json()
        if (data.success) {
          showToast("試合を開始しました", "success")
          setShowModal(false)
          router.refresh()
        } else {
          showToast(data.error || "試合開始に失敗しました", "error")
          setShowModal(false)
        }
      } catch {
        showToast("通信エラーが発生しました", "error")
        setShowModal(false)
      }
    })
  }

  // 結果確定
  const handleConfirmResults = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/events/${eventId}/matches/confirm`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              round_number: selectedRound,
              results: currentMatches.map((m) => ({
                match_id: m.matchId,
                result: results[m.matchId],
              })),
            }),
          },
        )
        const data = await res.json()
        if (data.success) {
          showToast("結果を確定しました", "success")
          setShowModal(false)
          router.refresh()
        } else {
          showToast(data.error || "結果確定に失敗しました", "error")
          setShowModal(false)
        }
      } catch {
        showToast("通信エラーが発生しました", "error")
        setShowModal(false)
      }
    })
  }

  // イベント完了
  const handleCompleteEvent = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/events/${eventId}/complete`,
          {
            method: "PATCH",
          },
        )
        const data = await res.json()
        if (data.success) {
          showToast("イベントを完了しました", "success")
          setShowModal(false)
          router.refresh()
        } else {
          showToast(data.error || "イベント完了に失敗しました", "error")
          setShowModal(false)
        }
      } catch {
        showToast("通信エラーが発生しました", "error")
        setShowModal(false)
      }
    })
  }

  // チーム編成確定後
  const handleTeamAssignmentSuccess = () => {
    router.refresh()
  }

  // ボタン表示条件
  const allWaiting =
    currentMatches.length > 0 &&
    currentMatches.every((m) => m.status === "waiting")
  const allInProgress =
    currentMatches.length > 0 &&
    currentMatches.every((m) => m.status === "in_progress")
  const allResultsSet =
    allInProgress &&
    currentMatches.every(
      (m) => results[m.matchId] === "team_a" || results[m.matchId] === "team_b",
    )

  // 全ラウンド完了判定
  const allRoundsConfirmed = (() => {
    const confirmedRoundCount = new Set(
      matchData
        .filter((m) => m.status === "confirmed")
        .map((m) => m.roundNumber),
    ).size
    return confirmedRoundCount >= totalRounds
  })()

  // タブアイコン
  const getRoundIcon = (state: RoundState) => {
    switch (state) {
      case "confirmed":
        return <Check className="w-3.5 h-3.5 text-green-500" />
      case "in_progress":
        return <Play className="w-3.5 h-3.5 text-blue-500" />
      case "waiting":
        return <Clock className="w-3.5 h-3.5 text-gray-400" />
      case "team_assignment":
        return <Shuffle className="w-3.5 h-3.5 text-amber-500" />
      default:
        return null
    }
  }

  return (
    <>
      {/* ラウンドタブ */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((rn) => {
          const state = getRoundState(rn)
          const isActive = selectedRound === rn
          const isClickable = state !== "future"

          return (
            <button
              key={rn}
              type="button"
              onClick={() => isClickable && setSelectedRound(rn)}
              disabled={!isClickable}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : isClickable
                    ? "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    : "border-transparent text-gray-300 cursor-not-allowed"
              }`}
            >
              {getRoundIcon(state)}
              ラウンド {rn}
            </button>
          )
        })}
      </div>

      {/* コンテンツ切替 */}
      {currentRoundState === "team_assignment" ? (
        <TeamAssignmentBoard
          participants={participants}
          matchCount={matchCount}
          roundNumber={selectedRound}
          eventId={eventId}
          existingRounds={existingRounds}
          standingsMap={standingsMap}
          onSuccess={handleTeamAssignmentSuccess}
        />
      ) : (
        <>
          {/* マッチカード一覧 */}
          {currentMatches.length > 0 ? (
            <div className="space-y-4 mb-6">
              {currentMatches.map((match) => {
                const tentative = computeTentativeResult(
                  match.teamA,
                  match.teamB,
                )
                return (
                  <MatchCard
                    key={match.matchId}
                    match={match}
                    tentativeResult={tentative}
                    selectedResult={results[match.matchId] ?? null}
                    onResultChange={handleResultChange}
                    isRoundInProgress={currentRoundState === "in_progress"}
                  />
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              このラウンドにはマッチがありません
            </div>
          )}

          {/* 操作ボタンエリア */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-t border-border">
            <div className="max-w-5xl mx-auto flex items-center justify-end gap-3">
              {allWaiting && (
                <button
                  type="button"
                  onClick={() => {
                    setModalType("start")
                    setShowModal(true)
                  }}
                  disabled={isPending}
                  className="glow-button px-6 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {isPending ? "処理中..." : "試合開始"}
                </button>
              )}

              {allInProgress && (
                <button
                  type="button"
                  onClick={() => {
                    setModalType("confirm")
                    setShowModal(true)
                  }}
                  disabled={!allResultsSet || isPending}
                  className="glow-button px-6 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isPending ? "処理中..." : "結果確定"}
                </button>
              )}

              {allRoundsConfirmed && eventStatus === "in_progress" && (
                <button
                  type="button"
                  onClick={() => {
                    setModalType("complete")
                    setShowModal(true)
                  }}
                  disabled={isPending}
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  {isPending ? "処理中..." : "イベント完了"}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* 累計成績 */}
      {matchData.some((m) => m.status === "confirmed") && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">累計成績</h3>
          <StandingsTable matches={matchData} />
        </div>
      )}

      {/* 確認モーダル */}
      {showModal && (
        <ConfirmModal
          type={modalType}
          roundNumber={selectedRound}
          onConfirm={
            modalType === "confirm"
              ? handleConfirmResults
              : modalType === "start"
                ? handleStartRound
                : handleCompleteEvent
          }
          onCancel={() => setShowModal(false)}
          isLoading={isPending}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          show={true}
          isExiting={isExiting}
        />
      )}
    </>
  )
}
