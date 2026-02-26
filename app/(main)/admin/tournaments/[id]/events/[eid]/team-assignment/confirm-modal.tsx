"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"

import type { MatchSlot, TeamAssignmentRequest } from "@/lib/types/match"

type ConfirmModalProps = {
  matches: MatchSlot[]
  roundNumber: number
  eventId: string
  onClose: () => void
  onSuccess: () => void
}

export function ConfirmModal({
  matches,
  roundNumber,
  eventId,
  onClose,
  onSuccess,
}: ConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

  const totalParticipants = matches.reduce(
    (sum, m) => sum + m.teamA.length + m.teamB.length,
    0,
  )

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onClose, isSubmitting])

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const payload: TeamAssignmentRequest = {
        matches: matches.map((m) => ({
          team_a_profile_ids: m.teamA.map((p) => p.profileId),
          team_b_profile_ids: m.teamB.map((p) => p.profileId),
        })),
      }

      const response = await fetch(
        `/api/admin/events/${eventId}/team-assignment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      const result = await response.json()

      if (result.success) {
        setIsCompleted(true)
      } else {
        setError(result.error ?? "チーム編成の確定に失敗しました")
      }
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={() => !isSubmitting && !isCompleted && onClose()}
        aria-label="モーダルを閉じる"
      />
      <div
        className="relative modal-content rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden opacity-0"
        style={{
          animation: "card-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {/* ヘッダー */}
        <div className="px-6 py-5 border-b border-orange-100 bg-gradient-to-r from-primary/5 to-amber-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            チーム編成の確認
          </h2>
        </div>

        {isCompleted ? (
          /* 確定完了 */
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">
              チーム編成が確定しました
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {totalParticipants}人を{matches.length}マッチに編成しました（ラウンド{roundNumber}）
            </p>
            <button
              type="button"
              onClick={onSuccess}
              className="glow-button px-6 py-2.5 text-sm font-semibold rounded-xl text-white"
            >
              OK
            </button>
          </div>
        ) : (
          <>
            {/* サマリー */}
            <div className="px-6 pt-5 pb-3">
              <div className="text-sm font-medium rounded-lg px-3 py-2 bg-blue-50 text-blue-700">
                {totalParticipants}人を{matches.length}マッチに編成します（ラウンド{roundNumber}）
              </div>
            </div>

            {/* マッチ一覧 */}
            <div className="px-6 pb-3 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {matches.map((match, idx) => (
                  <div
                    key={`match-${idx}`}
                    className="bg-gray-50 rounded-lg p-3"
                  >
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      マッチ {idx + 1}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">
                          Team A
                        </p>
                        <ul className="space-y-0.5">
                          {match.teamA.map((p) => (
                            <li
                              key={p.profileId}
                              className="text-sm text-gray-700"
                            >
                              {p.playerName ?? "（未設定）"}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-1">
                          Team B
                        </p>
                        <ul className="space-y-0.5">
                          {match.teamB.map((p) => (
                            <li
                              key={p.profileId}
                              className="text-sm text-gray-700"
                            >
                              {p.playerName ?? "（未設定）"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="px-6 pb-3">
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              </div>
            )}

            {/* フッター */}
            <div className="px-6 py-4 border-t border-orange-100 flex gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="glass-button flex-1 px-4 py-2.5 text-sm font-medium rounded-xl text-gray-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="glow-button flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                確定する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
