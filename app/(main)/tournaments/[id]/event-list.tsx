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
    <>
      {/* デスクトップ: テーブル表示 */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-gray-500">
              <th className="px-4 py-3 font-medium">イベント名</th>
              <th className="px-4 py-3 font-medium text-center">試合数</th>
              <th className="px-4 py-3 font-medium text-center">参加上限</th>
              <th className="px-4 py-3 font-medium">開催日</th>
              <th className="px-4 py-3 font-medium">エントリー期間</th>
              <th className="px-4 py-3 font-medium">チェックイン</th>
              <th className="px-4 py-3 font-medium text-center">
                エントリー人数
              </th>
              <th className="px-4 py-3 font-medium text-center">操作</th>
            </tr>
          </thead>
          <tbody>
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
                <tr
                  key={event.id}
                  className="border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {event.name}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {event.match_format === "double_elimination"
                      ? "-"
                      : event.matches_per_event}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {event.max_participants ?? "無制限"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDateJST(event.scheduled_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDateTimeJST(event.entry_start)} 〜{" "}
                    {formatTimeJST(event.entry_end)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatTimeJST(event.checkin_start)} 〜{" "}
                    {formatTimeJST(event.checkin_end)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {entryCount}人
                  </td>
                  <td className="px-4 py-3 text-center">
                    <EntryButton
                      state={buttonState}
                      onClick={() => handleButtonClick(buttonState)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* モバイル: カード表示 */}
      <div className="md:hidden space-y-4">
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

              <EntryButton
                state={buttonState}
                onClick={() => handleButtonClick(buttonState)}
                fullWidth
              />
            </div>
          )
        })}
      </div>
    </>
  )
}

// エントリーボタンコンポーネント
function EntryButton({
  state,
  onClick,
  fullWidth = false,
}: {
  state: EntryButtonState
  onClick: () => void
  fullWidth?: boolean
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
