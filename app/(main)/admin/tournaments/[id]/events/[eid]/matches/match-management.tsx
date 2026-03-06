"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, Clock, Play, Trophy, ArrowRight } from "lucide-react"

import { Toast } from "@/app/components/toast"
import { useMatchRealtime } from "@/lib/hooks/use-match-realtime"
import type {
  AdminMatchForDisplay,
  AdminMatchParticipant,
  MatchResult,
} from "@/lib/types/match"
import { computeTentativeResult } from "@/lib/utils/match-result"
import { MatchCard } from "./match-card"
import { StandingsTable } from "./standings-table"
import { ConfirmModal } from "./confirm-modal"

type MatchManagementProps = {
  matches: AdminMatchForDisplay[]
  totalRounds: number
  eventId: string
  tournamentId: string
  eventStatus: string
}

export function MatchManagement({
  matches,
  totalRounds,
  eventId,
  tournamentId,
  eventStatus,
}: MatchManagementProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [matchData, setMatchData] = useState<AdminMatchForDisplay[]>(matches)

  // props 変更時にリセット
  useEffect(() => {
    setMatchData(matches)
  }, [matches])

  // ラウンドごとのマッチ整理
  const roundNumbers = [...new Set(matchData.map((m) => m.roundNumber))].sort()

  // デフォルト選択: 最新の未完了ラウンド、なければ最終ラウンド
  const defaultRound = (() => {
    const incomplete = roundNumbers.filter((rn) =>
      matchData
        .filter((m) => m.roundNumber === rn)
        .some((m) => m.status !== "confirmed"),
    )
    if (incomplete.length > 0) return incomplete[0]
    return roundNumbers[roundNumbers.length - 1] ?? 1
  })()

  const [selectedRound, setSelectedRound] = useState(defaultRound)
  const [results, setResults] = useState<Record<string, MatchResult>>({})
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"confirm" | "complete">("confirm")
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

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

  // ラウンド切替時 or matchData 更新時に results を再計算
  useEffect(() => {
    const current = matchData.filter((m) => m.roundNumber === selectedRound)
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
          router.refresh()
        } else {
          showToast(data.error || "試合開始に失敗しました", "error")
        }
      } catch {
        showToast("通信エラーが発生しました", "error")
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

  // ラウンド状態判定
  const getRoundStatus = (rn: number) => {
    const roundMatches = matchData.filter((m) => m.roundNumber === rn)
    if (roundMatches.length === 0) return "no_matches" as const
    if (roundMatches.every((m) => m.status === "confirmed"))
      return "confirmed" as const
    if (roundMatches.some((m) => m.status === "in_progress"))
      return "in_progress" as const
    return "waiting" as const
  }

  const currentRoundStatus = getRoundStatus(selectedRound)

  // ボタン表示条件
  const allWaiting =
    currentMatches.length > 0 &&
    currentMatches.every((m) => m.status === "waiting")
  const allInProgress =
    currentMatches.length > 0 &&
    currentMatches.every((m) => m.status === "in_progress")
  const allConfirmed =
    currentMatches.length > 0 &&
    currentMatches.every((m) => m.status === "confirmed")
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

  // 次ラウンドのチーム編成リンク表示条件
  const showNextTeamAssignment =
    allConfirmed &&
    selectedRound < totalRounds &&
    !roundNumbers.includes(selectedRound + 1)

  return (
    <>
      {/* ラウンドタブ */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((rn) => {
          const status = getRoundStatus(rn)
          const isActive = selectedRound === rn
          const isClickable = status !== "no_matches"

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
              {status === "confirmed" && (
                <Check className="w-3.5 h-3.5 text-green-500" />
              )}
              {status === "in_progress" && (
                <Play className="w-3.5 h-3.5 text-blue-500" />
              )}
              {status === "waiting" && (
                <Clock className="w-3.5 h-3.5 text-gray-400" />
              )}
              ラウンド {rn}
            </button>
          )
        })}
      </div>

      {/* マッチカード一覧 */}
      {currentMatches.length > 0 ? (
        <div className="space-y-4 mb-6">
          {currentMatches.map((match) => {
            const tentative = computeTentativeResult(match.teamA, match.teamB)
            return (
              <MatchCard
                key={match.matchId}
                match={match}
                tentativeResult={tentative}
                selectedResult={results[match.matchId] ?? null}
                onResultChange={handleResultChange}
                isRoundInProgress={currentRoundStatus === "in_progress"}
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
              onClick={handleStartRound}
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

          {showNextTeamAssignment && (
            <Link
              href={`/admin/tournaments/${tournamentId}/events/${eventId}/team-assignment`}
              className="glow-button px-6 py-2.5 text-sm font-semibold rounded-xl text-white inline-flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              次ラウンドのチーム編成
            </Link>
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
