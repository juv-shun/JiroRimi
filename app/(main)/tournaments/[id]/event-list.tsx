"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

  // 1分ごとに現在時刻を更新（ボタン状態の再評価用）
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-gray-500">
        イベントがまだ作成されていません
      </div>
    )
  }

  const handleButtonClick = (state: EntryButtonState) => {
    if (state === "not_logged_in") {
      router.push("/login")
    }
    // can_entry, can_cancel は 1.5.3, 1.5.4 で実装
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
                {event.rules && (
                  <button
                    type="button"
                    onClick={() =>
                      setRulesModal({
                        eventName: event.name,
                        rules: event.rules as string,
                      })
                    }
                    className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ルール詳細
                  </button>
                )}
                <EntryButton
                  state={buttonState}
                  onClick={() => handleButtonClick(buttonState)}
                  fullWidth={!event.rules}
                  className={event.rules ? "flex-1" : ""}
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
    </div>
  )
}

// エントリーボタンコンポーネント
function EntryButton({
  state,
  onClick,
  fullWidth = false,
  className: additionalClassName = "",
}: {
  state: EntryButtonState
  onClick: () => void
  fullWidth?: boolean
  className?: string
}) {
  const label = ENTRY_BUTTON_LABELS[state]

  // 1.5.2 では can_entry, can_cancel は未実装のため disabled
  // not_logged_in のみ onClick でログインページへ遷移
  const isDisabled =
    state === "invite" ||
    state === "before_start" ||
    state === "closed" ||
    state === "can_entry" ||
    state === "can_cancel"

  // スタイルの決定
  let className = "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"

  // 非活性状態（グレー表示）
  if (state === "invite" || state === "before_start" || state === "closed") {
    className += " bg-gray-200 text-gray-500 cursor-not-allowed"
  }
  // キャンセルボタン（赤系）- 1.5.2では未実装だがスタイルは適用
  else if (state === "can_cancel") {
    className += " bg-red-500 text-white opacity-50 cursor-not-allowed"
  }
  // エントリーボタン（プライマリ）- 1.5.2では未実装だがスタイルは適用
  else if (state === "can_entry") {
    className += " bg-primary text-white opacity-50 cursor-not-allowed"
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
