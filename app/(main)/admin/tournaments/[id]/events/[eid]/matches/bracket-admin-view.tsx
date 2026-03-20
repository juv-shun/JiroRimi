"use client"

import { ChevronDown, ChevronUp, RefreshCw, Swords, Trophy } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Toast } from "@/app/components/toast"
import { useBracketRealtime } from "@/lib/hooks/use-bracket-realtime"
import type { RawBracketMatch, TeamInfo } from "@/lib/types/bracket"
import {
  deriveFinalRankings,
  isAllBracketMatchesConfirmed,
  organizeBracketData,
} from "@/lib/utils/bracket"

import { BracketAdminMatchCard } from "./bracket-admin-match-card"
import { BracketConfirmModal } from "./bracket-confirm-modal"
import { FinalRankings } from "./final-rankings"

type BracketAdminViewProps = {
  initialBracketMatches: RawBracketMatch[]
  teams: TeamInfo[]
  eventId: string
  tournamentId: string
}

type ModalState =
  | { type: "generate" }
  | { type: "regenerate" }
  | { type: "confirm"; matchId: string; winnerTeam: TeamInfo }
  | { type: "complete" }
  | null

const SECTION_CONFIG = [
  { key: "winners", title: "Winners Bracket", colorClass: "amber" },
  { key: "losers", title: "Losers Bracket", colorClass: "blue" },
  { key: "grandFinal", title: "Grand Final", colorClass: "purple" },
] as const

const COLOR_MAP = {
  amber: "bg-gradient-to-r from-amber-500 to-orange-500",
  blue: "bg-gradient-to-r from-blue-500 to-indigo-500",
  purple: "bg-gradient-to-r from-purple-500 to-pink-500",
}

const ROUND_LABELS: Record<string, Record<number, string>> = {
  winners: { 1: "Winners Round 1", 2: "Winners Final" },
  losers: { 1: "Losers Round 1", 2: "Losers Final" },
  grand_final: { 1: "Grand Final", 2: "Reset Match" },
}

function getRoundLabel(bracketType: string, roundNumber: number): string {
  return ROUND_LABELS[bracketType]?.[roundNumber] ?? `Round ${roundNumber}`
}

export function BracketAdminView({
  initialBracketMatches,
  teams,
  eventId,
  tournamentId,
}: BracketAdminViewProps) {
  const router = useRouter()
  const [bracketMatches, setBracketMatches] = useState(initialBracketMatches)
  const [modalState, setModalState] = useState<ModalState>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTeams, setShowTeams] = useState(false)

  // Toast state
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState<"success" | "error">("success")
  const [showToast, setShowToast] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const showToastMessage = (message: string, type: "success" | "error") => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    setIsExiting(false)
    setTimeout(() => setIsExiting(true), 2500)
    setTimeout(() => {
      setShowToast(false)
      setIsExiting(false)
    }, 3000)
  }

  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams],
  )

  const organizedBracket = useMemo(
    () => organizeBracketData(bracketMatches, teamMap),
    [bracketMatches, teamMap],
  )

  const allConfirmed = useMemo(
    () =>
      bracketMatches.length > 0 &&
      isAllBracketMatchesConfirmed(bracketMatches),
    [bracketMatches],
  )

  const rankings = useMemo(
    () => (allConfirmed ? deriveFinalRankings(bracketMatches, teamMap) : []),
    [allConfirmed, bracketMatches, teamMap],
  )

  const hasConfirmedMatches = bracketMatches.some(
    (m) => m.status === "confirmed",
  )

  // Realtime
  const onBracketMatchUpdate = useCallback(
    (matchId: string, newRow: RawBracketMatch) => {
      setBracketMatches((prev) => {
        const exists = prev.some((m) => m.id === matchId)
        if (!exists) return [...prev, newRow]
        return prev.map((m) => (m.id === matchId ? newRow : m))
      })
    },
    [],
  )

  const onBracketMatchInsert = useCallback((newRow: RawBracketMatch) => {
    setBracketMatches((prev) => [...prev, newRow])
  }, [])

  const onBracketMatchDelete = useCallback((matchId: string) => {
    setBracketMatches((prev) => prev.filter((m) => m.id !== matchId))
  }, [])

  useBracketRealtime({
    eventId,
    onBracketMatchUpdate,
    onBracketMatchInsert,
    onBracketMatchDelete,
  })

  // initialBracketMatches が変わったら state を同期（router.refresh() 後に反映）
  useEffect(() => {
    setBracketMatches(initialBracketMatches)
  }, [initialBracketMatches])

  // Actions
  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/bracket/generate`,
        { method: "POST" },
      )
      const data = await res.json()
      if (!data.success) {
        showToastMessage(data.error ?? "生成に失敗しました", "error")
        return
      }
      showToastMessage("ブラケットを生成しました", "success")
      // Realtime で INSERT が来る前に state をリセットし、router.refresh() でサーバーから最新データを取得
      setBracketMatches([])
      router.refresh()
    } catch {
      showToastMessage("サーバーエラーが発生しました", "error")
    } finally {
      setIsLoading(false)
      setModalState(null)
    }
  }

  const handleConfirmMatch = async () => {
    if (modalState?.type !== "confirm") return
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/bracket/confirm`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bracket_match_id: modalState.matchId,
            winner_team_id: modalState.winnerTeam.id,
          }),
        },
      )
      const data = await res.json()
      if (!data.success) {
        showToastMessage(data.error ?? "確定に失敗しました", "error")
        return
      }
      showToastMessage("結果を確定しました", "success")
    } catch {
      showToastMessage("サーバーエラーが発生しました", "error")
    } finally {
      setIsLoading(false)
      setModalState(null)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/complete`, {
        method: "PATCH",
      })
      const data = await res.json()
      if (!data.success) {
        showToastMessage(data.error ?? "完了に失敗しました", "error")
        return
      }
      showToastMessage("イベントを完了しました", "success")
      router.push(`/admin/tournaments/${tournamentId}/edit`)
    } catch {
      showToastMessage("サーバーエラーが発生しました", "error")
    } finally {
      setIsLoading(false)
      setModalState(null)
    }
  }

  const handleModalConfirm = () => {
    if (!modalState) return
    switch (modalState.type) {
      case "generate":
      case "regenerate":
        handleGenerate()
        break
      case "confirm":
        handleConfirmMatch()
        break
      case "complete":
        handleComplete()
        break
    }
  }

  // ブラケット未生成
  if (bracketMatches.length === 0) {
    return (
      <>
        {/* チーム一覧アコーディオン */}
        <TeamAccordion
          teams={teams}
          showTeams={showTeams}
          onToggle={() => setShowTeams(!showTeams)}
        />

        <div className="rich-card p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
            <Swords className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm mb-4">
            トーナメント表はまだ作成されていません
          </p>
          <button
            type="button"
            onClick={() => setModalState({ type: "generate" })}
            className="glow-button px-6 py-2.5 text-sm font-semibold rounded-xl text-white inline-flex items-center gap-2"
          >
            <Swords className="w-4 h-4" />
            ブラケット生成
          </button>
        </div>

        {modalState && (
          <BracketConfirmModal
            type={modalState.type === "confirm" ? "confirm" : modalState.type}
            onConfirm={handleModalConfirm}
            onCancel={() => setModalState(null)}
            isLoading={isLoading}
          />
        )}
        <Toast
          message={toastMessage}
          type={toastType}
          show={showToast}
          isExiting={isExiting}
        />
      </>
    )
  }

  // ブラケット生成済み
  return (
    <>
      {/* チーム一覧アコーディオン */}
      <TeamAccordion
        teams={teams}
        showTeams={showTeams}
        onToggle={() => setShowTeams(!showTeams)}
      />

      {/* 最終順位（全マッチ確定時） */}
      {allConfirmed && <FinalRankings rankings={rankings} />}

      {/* ブラケットセクション */}
      <div className="space-y-6">
        {SECTION_CONFIG.map(({ key, title, colorClass }) => {
          const rounds = organizedBracket[key]
          if (rounds.length === 0) return null

          return (
            <div key={key} className="rich-card overflow-hidden">
              <div
                className={`${COLOR_MAP[colorClass]} text-white px-5 py-3`}
              >
                <h2 className="font-bold text-sm tracking-wide">{title}</h2>
              </div>
              <div className="p-5">
                <div
                  className="grid gap-6"
                  style={{
                    gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))`,
                  }}
                >
                  {rounds.map((round) => {
                    const bracketType =
                      round.matches[0]?.bracketType ?? "winners"
                    return (
                      <div key={round.roundNumber}>
                        <p className="text-xs font-semibold text-gray-500 mb-3 text-center">
                          {getRoundLabel(bracketType, round.roundNumber)}
                        </p>
                        <div className="flex flex-col justify-center gap-4 h-full">
                          {round.matches.map((match) => (
                            <BracketAdminMatchCard
                              key={match.id}
                              match={match}
                              onConfirm={(matchId, winnerTeam) =>
                                setModalState({
                                  type: "confirm",
                                  matchId,
                                  winnerTeam,
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3 mt-6">
        {!hasConfirmedMatches && (
          <button
            type="button"
            onClick={() => setModalState({ type: "regenerate" })}
            className="glass-button px-4 py-2.5 text-sm font-medium rounded-xl text-gray-700 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            再生成
          </button>
        )}
        {allConfirmed && (
          <button
            type="button"
            onClick={() => setModalState({ type: "complete" })}
            className="bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 px-6 py-2.5 text-sm font-semibold rounded-xl text-white inline-flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            イベント完了
          </button>
        )}
      </div>

      {/* モーダル */}
      {modalState && (
        <BracketConfirmModal
          type={modalState.type === "confirm" ? "confirm" : modalState.type}
          teamName={
            modalState.type === "confirm"
              ? modalState.winnerTeam.name
              : undefined
          }
          onConfirm={handleModalConfirm}
          onCancel={() => setModalState(null)}
          isLoading={isLoading}
        />
      )}

      <Toast
        message={toastMessage}
        type={toastType}
        show={showToast}
        isExiting={isExiting}
      />
    </>
  )
}

function TeamAccordion({
  teams,
  showTeams,
  onToggle,
}: {
  teams: TeamInfo[]
  showTeams: boolean
  onToggle: () => void
}) {
  return (
    <div className="rich-card overflow-hidden mb-6">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-green-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            チーム編成（確定済み）
          </h3>
        </div>
        {showTeams ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {showTeams && (
        <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
            >
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/10 to-amber-100 flex items-center justify-center text-[10px] text-primary font-bold flex-shrink-0">
                {team.seed}
              </span>
              <span className="text-sm font-medium text-gray-900 truncate">
                {team.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
