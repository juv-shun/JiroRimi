"use client"

import { useEffect, useState } from "react"
import { Loader2, Play } from "lucide-react"

import type { EntryWithProfile } from "@/lib/types/entry"

type StartEventModalProps = {
  eventId: string
  entries: EntryWithProfile[] // チェックイン済みのエントリーのみ
  onClose: () => void
  onSuccess: () => void
}

export function StartEventModal({
  eventId,
  entries,
  onClose,
  onSuccess,
}: StartEventModalProps) {
  // チェックイン時刻降順（遅い順）にソート → 除外候補が上部に来る
  const sortedEntries = [...entries].sort((a, b) => {
    const aTime = a.checked_in_at ?? ""
    const bTime = b.checked_in_at ?? ""
    return bTime.localeCompare(aTime)
  })

  // 除外人数 = チェックイン済み人数 % 10
  const excludeCount = sortedEntries.length % 10

  // 初期状態: 先頭（チェックインが遅い順）から除外
  const initialExcluded = new Set(
    sortedEntries.slice(0, excludeCount).map((e) => e.id),
  )

  const [excludedIds, setExcludedIds] = useState<Set<string>>(initialExcluded)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const participantCount = sortedEntries.length - excludedIds.size
  const isValid = participantCount >= 10 && participantCount % 10 === 0

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onClose])

  const toggleEntry = (entryId: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  const handleStart = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/events/${eventId}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excluded_entry_ids: [...excludedIds],
        }),
      })
      const result = await response.json()

      if (result.success) {
        onSuccess()
      } else {
        setError(result.error ?? "イベントの開始に失敗しました")
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
        onClick={onClose}
        aria-label="モーダルを閉じる"
      />
      <div
        className="relative modal-content rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden opacity-0"
        style={{
          animation: "card-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {/* ヘッダー */}
        <div className="px-6 py-5 border-b border-orange-100 bg-gradient-to-r from-primary/5 to-amber-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
            イベント開始
          </h2>
        </div>

        {/* サマリー */}
        <div className="px-6 pt-5 pb-3">
          <div
            className={`text-sm font-medium rounded-lg px-3 py-2 ${
              isValid
                ? "bg-blue-50 text-blue-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            チェックイン: {sortedEntries.length}人 → 参加:{" "}
            {participantCount}人（{excludedIds.size}人除外）
            {!isValid && participantCount < 10 && (
              <span className="block text-xs mt-1">
                参加人数が10人未満です
              </span>
            )}
            {!isValid && participantCount >= 10 && participantCount % 10 !== 0 && (
              <span className="block text-xs mt-1">
                参加人数が10の倍数ではありません
              </span>
            )}
          </div>
        </div>

        {/* ユーザーリスト */}
        <div className="px-6 pb-3 max-h-80 overflow-y-auto">
          <div className="space-y-1">
            {sortedEntries.map((entry) => {
              const isExcluded = excludedIds.has(entry.id)
              return (
                <label
                  key={entry.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isExcluded
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={() => toggleEntry(entry.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50"
                  />
                  <span
                    className={`text-sm ${
                      isExcluded
                        ? "text-gray-400 line-through"
                        : "text-gray-900"
                    }`}
                  >
                    {entry.profiles?.player_name ?? "（未設定）"}
                  </span>
                </label>
              )
            })}
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
            onClick={handleStart}
            disabled={!isValid || isSubmitting}
            className="glow-button flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            開始する（{participantCount}人で参加）
          </button>
        </div>
      </div>
    </div>
  )
}
