"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Toast } from "@/app/components/toast"
import type { TournamentEventForDisplay } from "@/lib/types/tournament"
import {
  formatDateJST,
  formatDateTimeJST,
  formatTimeJST,
} from "@/lib/utils/datetime"
import {
  ENTRY_BUTTON_LABELS,
  type EntryButtonState,
  getEntryButtonState,
} from "./get-entry-button-state"

type EventListProps = {
  events: TournamentEventForDisplay[]
  isLoggedIn: boolean
  userEntries: string[]
}

export function EventList({ events, isLoggedIn, userEntries }: EventListProps) {
  const router = useRouter()
  const [now, setNow] = useState(() => new Date())
  const [rulesModal, setRulesModal] = useState<{
    eventName: string
    rules: string
  } | null>(null)
  const [confirmEvent, setConfirmEvent] =
    useState<TournamentEventForDisplay | null>(null)
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // 1分ごとに現在時刻を更新（ボタン状態の再評価用）
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // アンマウント時のトーストタイマークリーンアップ
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

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-gray-500">
        イベントがまだ作成されていません
      </div>
    )
  }

  const handleButtonClick = (
    state: EntryButtonState,
    event: TournamentEventForDisplay,
  ) => {
    if (state === "not_logged_in") {
      router.push("/login")
      return
    }

    if (state === "can_entry") {
      setConfirmEvent(event)
    }
    // can_cancel は 1.5.4 で実装
  }

  const handleEntryConfirm = async () => {
    if (!confirmEvent) return
    const eventId = confirmEvent.id
    setConfirmEvent(null)
    setLoadingEventId(eventId)
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      })
      const data = await res.json()

      if (data.success) {
        showToast("エントリーしました", "success")
        router.refresh()
      } else if (res.status === 401) {
        router.push("/login")
      } else {
        showToast(data.error || "エントリーに失敗しました", "error")
      }
    } catch {
      showToast("エントリーに失敗しました", "error")
    } finally {
      setLoadingEventId(null)
    }
  }

  return (
    <div className="space-y-4">
        {events.map((event) => {
          const isEntered = userEntries.includes(event.id)
          const buttonState = getEntryButtonState(
            event,
            isLoggedIn,
            isEntered,
            now,
          )
          const entryCount = event.entries[0]?.count ?? 0

          return (
            <div
              key={event.id}
              className="bg-white rounded-2xl shadow-sm border border-border p-4"
            >
              <h3 className="font-medium text-gray-900 mb-3">{event.name}</h3>

              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div>
                  <span className="text-gray-500">試合数:</span>{" "}
                  <span className="text-gray-900">
                    {event.match_format === "double_elimination"
                      ? "-"
                      : event.matches_per_event}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">参加上限:</span>{" "}
                  <span className="text-gray-900">
                    {event.max_participants ?? "無制限"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">開催日:</span>{" "}
                  <span className="text-gray-900">
                    {formatDateJST(event.scheduled_date)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">エントリー:</span>{" "}
                  <span className="text-gray-900">
                    {formatDateTimeJST(event.entry_start)} 〜{" "}
                    {formatTimeJST(event.entry_end)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">チェックイン:</span>{" "}
                  <span className="text-gray-900">
                    {formatTimeJST(event.checkin_start)} 〜{" "}
                    {formatTimeJST(event.checkin_end)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">エントリー人数:</span>{" "}
                  <span className="text-gray-900">{entryCount}人</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRulesModal({
                      eventName: event.name,
                      rules: event.rules ?? "",
                    })
                  }
                  className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ルール詳細
                </button>
                <EntryButton
                  state={buttonState}
                  onClick={() => handleButtonClick(buttonState, event)}
                  loading={loadingEventId === event.id}
                  className="flex-1"
                />
              </div>
            </div>
          )
        })}

      {rulesModal && (
        <RulesModal
          eventName={rulesModal.eventName}
          rules={rulesModal.rules}
          onClose={() => setRulesModal(null)}
        />
      )}

      {confirmEvent && (
        <EntryConfirmModal
          event={confirmEvent}
          onConfirm={handleEntryConfirm}
          onClose={() => setConfirmEvent(null)}
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
    </div>
  )
}

// エントリーボタンコンポーネント
function EntryButton({
  state,
  onClick,
  loading = false,
  fullWidth = false,
  className: additionalClassName = "",
}: {
  state: EntryButtonState
  onClick: () => void
  loading?: boolean
  fullWidth?: boolean
  className?: string
}) {
  const label = loading ? "エントリー中..." : ENTRY_BUTTON_LABELS[state]

  const isDisabled =
    loading ||
    state === "invite" ||
    state === "before_start" ||
    state === "closed" ||
    state === "can_cancel"

  // スタイルの決定
  let className = "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"

  // 非活性状態（グレー表示）
  if (state === "invite" || state === "before_start" || state === "closed") {
    className += " bg-gray-200 text-gray-500 cursor-not-allowed"
  }
  // キャンセルボタン（赤系）- 1.5.4で実装予定のため disabled
  else if (state === "can_cancel") {
    className += " bg-red-500 text-white opacity-50 cursor-not-allowed"
  }
  // エントリーボタン（プライマリ・活性）
  else if (state === "can_entry") {
    className += loading
      ? " bg-primary text-white opacity-50 cursor-not-allowed"
      : " bg-primary hover:bg-primary-hover text-white"
  }
  // ログインボタン（活性）
  else {
    className += " bg-primary hover:bg-primary-hover text-white"
  }

  if (fullWidth) {
    className += " w-full"
  }

  if (additionalClassName) {
    className += ` ${additionalClassName}`
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={className}
    >
      {label}
    </button>
  )
}

// エントリー確認モーダル
function EntryConfirmModal({
  event,
  onConfirm,
  onClose,
}: {
  event: TournamentEventForDisplay
  onConfirm: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="モーダルを閉じる"
      />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-gray-900">
            エントリー確認
          </h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-700 mb-3">
            以下のイベントにエントリーしますか？
          </p>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div>
              <span className="text-gray-500">イベント:</span>{" "}
              <span className="font-medium text-gray-900">{event.name}</span>
            </div>
            <div>
              <span className="text-gray-500">開催日:</span>{" "}
              <span className="text-gray-900">
                {formatDateJST(event.scheduled_date)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">チェックイン:</span>{" "}
              <span className="text-gray-900">
                {formatTimeJST(event.checkin_start)} 〜{" "}
                {formatTimeJST(event.checkin_end)}
              </span>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors"
          >
            エントリーする
          </button>
        </div>
      </div>
    </div>
  )
}

// ルール詳細モーダル
function RulesModal({
  eventName,
  rules,
  onClose,
}: {
  eventName: string
  rules: string
  onClose: () => void
}) {
  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* 背景クリックで閉じる */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="モーダルを閉じる"
      />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-gray-900">{eventName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
            {rules}
          </pre>
        </div>
        <div className="px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
