"use client"

import { CheckCircle, Star, Swords } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { Toast } from "@/app/components/toast"
import { useMatchRealtime } from "@/lib/hooks/use-match-realtime"
import type {
  MatchForDisplay,
  MatchParticipantForDisplay,
} from "@/lib/types/match"
import {
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
} from "@/lib/types/profile"

type MatchPageProps = {
  matches: MatchForDisplay[]
  eventId: string
}

export function MatchPage({ matches, eventId }: MatchPageProps) {
  const router = useRouter()
  const [matchData, setMatchData] = useState<MatchForDisplay[]>(matches)

  // props 変更時にリセット
  useEffect(() => {
    setMatchData(matches)
  }, [matches])

  // デフォルト選択: 最新の in_progress ラウンド、なければ最大 round_number
  const defaultRound = (() => {
    const inProgress = matchData.filter((m) => m.status === "in_progress")
    if (inProgress.length > 0) {
      return Math.max(...inProgress.map((m) => m.roundNumber))
    }
    return Math.max(...matchData.map((m) => m.roundNumber))
  })()

  const [selectedRound, setSelectedRound] = useState(defaultRound)
  const [lobbyNumber, setLobbyNumber] = useState("")
  const [lobbyLoading, setLobbyLoading] = useState(false)
  const [voteLoading, setVoteLoading] = useState(false)
  const [isVoteEditing, setIsVoteEditing] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

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
          const updateVote = (members: MatchParticipantForDisplay[]) =>
            members.map((p) =>
              p.profileId === profileId ? { ...p, vote } : p,
            )
          return { ...m, teamA: updateVote(m.teamA), teamB: updateVote(m.teamB) }
        }),
      )
    },
    onUnknownMatch: () => {
      router.refresh()
    },
  })

  const currentMatch = matchData.find((m) => m.roundNumber === selectedRound)

  // ラウンド切り替え時にロビー番号を同期
  useEffect(() => {
    setLobbyNumber(currentMatch?.lobbyNumber ?? "")
    setIsVoteEditing(false)
  }, [currentMatch?.lobbyNumber, selectedRound])

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

  const handleLobbyUpdate = async () => {
    if (!currentMatch || lobbyLoading) return
    setLobbyLoading(true)
    try {
      const res = await fetch(`/api/matches/${currentMatch.matchId}/lobby`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobby_number: lobbyNumber }),
      })
      const data = await res.json()

      if (data.success) {
        showToast("ロビー番号を更新しました", "success")
        router.refresh()
      } else if (res.status === 401) {
        router.push("/login")
      } else {
        showToast(data.error || "ロビー番号の更新に失敗しました", "error")
      }
    } catch {
      showToast("ロビー番号の更新に失敗しました", "error")
    } finally {
      setLobbyLoading(false)
    }
  }

  const handleVote = async (vote: "win" | "lose") => {
    if (!currentMatch || voteLoading) return
    setVoteLoading(true)
    try {
      const res = await fetch(`/api/matches/${currentMatch.matchId}/vote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      })
      const data = await res.json()

      if (data.success) {
        showToast("投票しました", "success")
        setIsVoteEditing(false)
        router.refresh()
      } else if (res.status === 401) {
        router.push("/login")
      } else {
        showToast(data.error || "投票に失敗しました", "error")
      }
    } catch {
      showToast("投票に失敗しました", "error")
    } finally {
      setVoteLoading(false)
    }
  }

  if (!currentMatch) return null

  const isInProgress = currentMatch.status === "in_progress"
  const isConfirmed = currentMatch.status === "confirmed"

  return (
    <div className="space-y-6">
      {/* ラウンドタブ */}
      {matchData.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {matchData.map((m) => (
            <button
              key={m.roundNumber}
              type="button"
              onClick={() => setSelectedRound(m.roundNumber)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedRound === m.roundNumber
                  ? "glow-button text-white"
                  : "glass-button text-gray-700"
              }`}
            >
              ラウンド {m.roundNumber}
              {m.status === "confirmed" && (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* マッチ情報カード */}
      <div className="rich-card p-5 space-y-5">
        {/* ステータスバッジ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            <span className="font-semibold text-gray-900">
              ラウンド {currentMatch.roundNumber}
            </span>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              isInProgress
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isInProgress ? "試合中" : "確定済み"}
          </span>
        </div>

        {/* チーム表示 */}
        <div className="space-y-3">
          <TeamSection
            label="チーム A"
            members={currentMatch.teamA}
            isMyTeam={currentMatch.myTeam === "team_a"}
          />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-bold text-gray-400">VS</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <TeamSection
            label="チーム B"
            members={currentMatch.teamB}
            isMyTeam={currentMatch.myTeam === "team_b"}
          />
        </div>

        {/* ロビー番号 */}
        <div className="border-t border-gray-100 pt-4">
          <label className="text-xs font-medium text-gray-500 mb-2 block">
            ロビー番号
          </label>
          {isInProgress ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={lobbyNumber}
                onChange={(e) => setLobbyNumber(e.target.value)}
                placeholder="ロビー番号を入力"
                maxLength={20}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button
                type="button"
                onClick={handleLobbyUpdate}
                disabled={lobbyLoading || !lobbyNumber.trim()}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  lobbyLoading || !lobbyNumber.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "glow-button text-white"
                }`}
              >
                {lobbyLoading ? "更新中..." : "更新"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-900 font-medium">
              {currentMatch.lobbyNumber || "未設定"}
            </p>
          )}
        </div>

        {/* 勝敗投票 */}
        <div className="border-t border-gray-100 pt-4">
          <label className="text-xs font-medium text-gray-500 mb-2 block">
            勝敗
          </label>
          {isConfirmed ? (
            <ConfirmedResult
              result={currentMatch.result}
              myTeam={currentMatch.myTeam}
            />
          ) : isInProgress ? (
            <VoteSection
              myVote={currentMatch.myVote}
              isEditing={isVoteEditing}
              loading={voteLoading}
              onVote={handleVote}
              onEdit={() => setIsVoteEditing(true)}
            />
          ) : null}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          show={true}
          isExiting={isExiting}
        />
      )}
    </div>
  )
}

// --- サブコンポーネント ---

function isAllowedAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") {
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

function TeamSection({
  label,
  members,
  isMyTeam,
}: {
  label: string
  members: MatchParticipantForDisplay[]
  isMyTeam: boolean
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        isMyTeam
          ? "bg-gradient-to-br from-primary/5 to-amber-50 border border-primary/20"
          : "bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isMyTeam && <Star className="w-3.5 h-3.5 text-primary fill-primary" />}
        <span
          className={`text-xs font-semibold ${
            isMyTeam ? "text-primary" : "text-gray-500"
          }`}
        >
          {label}
          {isMyTeam && " (自分のチーム)"}
        </span>
      </div>
      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.profileId} className="flex items-center gap-2">
            {m.avatarUrl && isAllowedAvatarUrl(m.avatarUrl) ? (
              <img
                src={m.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-[10px] text-gray-500">
                  {(m.playerName ?? "?")[0]}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-gray-900 flex-1 truncate">
              {m.playerName ?? "名前未設定"}
            </span>
            {m.firstRole && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight ${ROLE_BADGE_COLORS[m.firstRole]}`}
              >
                {ROLE_LABELS[m.firstRole]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function VoteSection({
  myVote,
  isEditing,
  loading,
  onVote,
  onEdit,
}: {
  myVote: string | null
  isEditing: boolean
  loading: boolean
  onVote: (vote: "win" | "lose") => void
  onEdit: () => void
}) {
  if (myVote && !isEditing) {
    return (
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${
            myVote === "win"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {myVote === "win" ? "勝ち" : "負け"}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-gray-500 hover:text-primary transition-colors underline"
        >
          変更する
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => onVote("win")}
        disabled={loading}
        className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
          loading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:-translate-y-0.5 active:translate-y-0"
        }`}
      >
        {loading ? "投票中..." : "勝ち"}
      </button>
      <button
        type="button"
        onClick={() => onVote("lose")}
        disabled={loading}
        className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
          loading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0"
        }`}
      >
        {loading ? "投票中..." : "負け"}
      </button>
    </div>
  )
}

function ConfirmedResult({
  result,
  myTeam,
}: {
  result: string | null
  myTeam: string
}) {
  if (!result) {
    return (
      <div className="text-center py-3 rounded-xl font-bold text-lg bg-gray-50 text-gray-500 border border-gray-200">
        未確定
      </div>
    )
  }
  const isWin = result === myTeam
  return (
    <div
      className={`text-center py-3 rounded-xl font-bold text-lg ${
        isWin
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {isWin ? "勝利" : "敗北"}
    </div>
  )
}
