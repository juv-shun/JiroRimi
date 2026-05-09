"use client"

import { AlertTriangle, User } from "lucide-react"
import type {
  AdminMatchForDisplay,
  AdminMatchParticipant,
  MatchResult,
  TentativeResult,
} from "@/lib/types/match"
import { ROLE_BADGE_COLORS, ROLE_LABELS } from "@/lib/types/profile"

type MatchCardProps = {
  match: AdminMatchForDisplay
  tentativeResult: TentativeResult
  selectedResult: MatchResult
  onResultChange: (matchId: string, result: MatchResult) => void
  isRoundInProgress: boolean
}

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

function ParticipantRow({
  participant,
  showVote,
}: {
  participant: AdminMatchParticipant
  showVote: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {participant.avatarUrl && isAllowedAvatarUrl(participant.avatarUrl) ? (
        <img
          src={participant.avatarUrl}
          alt=""
          loading="lazy"
          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-3 h-3 text-gray-400" />
        </div>
      )}
      <span className="text-sm font-medium text-gray-900 flex-1 truncate">
        {participant.playerName ?? "（未設定）"}
      </span>
      {participant.firstRole && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight ${ROLE_BADGE_COLORS[participant.firstRole]}`}
        >
          {ROLE_LABELS[participant.firstRole]}
        </span>
      )}
      {showVote && (
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            participant.vote
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {participant.vote ? "✓" : "―"}
        </span>
      )}
    </div>
  )
}

export function MatchCard({
  match,
  tentativeResult,
  selectedResult,
  onResultChange,
  isRoundInProgress,
}: MatchCardProps) {
  const isInProgress = match.status === "in_progress"
  const isConfirmed = match.status === "confirmed"
  const isConflict = tentativeResult === "conflict"

  const votedCount =
    match.teamA.filter((p) => p.vote !== null).length +
    match.teamB.filter((p) => p.vote !== null).length
  const totalCount = match.teamA.length + match.teamB.length

  const tentativeLabel =
    tentativeResult === "team_a"
      ? "Team A"
      : tentativeResult === "team_b"
        ? "Team B"
        : tentativeResult === "conflict"
          ? "⚠ 不一致"
          : "―"

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border p-5 ${
        isConflict && isInProgress
          ? "border-yellow-300 ring-1 ring-yellow-200"
          : "border-border"
      }`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">マッチ</span>
          {match.lobbyNumber && (
            <span className="text-xs text-gray-400">
              ロビー: {match.lobbyNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isInProgress && (
            <span className="text-xs text-gray-400">
              投票: {votedCount}/{totalCount}
            </span>
          )}
          {isConflict && isInProgress && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              不一致
            </span>
          )}
        </div>
      </div>

      {/* チーム表示 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-blue-50/50 p-3">
          <p className="text-xs font-semibold text-blue-600 mb-2">Team A</p>
          <div className="space-y-1.5">
            {match.teamA.map((p) => (
              <ParticipantRow
                key={p.profileId}
                participant={p}
                showVote={isInProgress}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-red-50/50 p-3">
          <p className="text-xs font-semibold text-red-600 mb-2">Team B</p>
          <div className="space-y-1.5">
            {match.teamB.map((p) => (
              <ParticipantRow
                key={p.profileId}
                participant={p}
                showVote={isInProgress}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 仮結果 + 確定結果入力 */}
      {(isInProgress || isConfirmed) && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          {isInProgress && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">仮結果:</span>
              <span
                className={`text-xs font-medium ${
                  isConflict ? "text-yellow-700" : "text-gray-700"
                }`}
              >
                {tentativeLabel}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">確定結果:</span>
            {isConfirmed ? (
              <span className="text-sm font-semibold text-gray-900">
                {match.result === "team_a"
                  ? "Team A"
                  : match.result === "team_b"
                    ? "Team B"
                    : "―"}
              </span>
            ) : isRoundInProgress ? (
              <select
                value={selectedResult ?? ""}
                onChange={(e) =>
                  onResultChange(
                    match.matchId,
                    (e.target.value as MatchResult) || null,
                  )
                }
                className="text-sm font-semibold rounded-lg border border-gray-400 bg-white px-3 py-1.5 text-gray-900 shadow-sm hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">未選択</option>
                <option value="team_a">Team A</option>
                <option value="team_b">Team B</option>
              </select>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
