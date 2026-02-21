"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

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
  tournamentId: string
  events: TournamentEventForDisplay[]
  isLoggedIn: boolean
  userEntries: string[]
  userGender: string | null
}

export function EventList({
  tournamentId,
  events,
  isLoggedIn,
  userEntries,
  userGender,
}: EventListProps) {
  const router = useRouter()
  const [now, setNow] = useState(() => new Date())
  const [rulesModal, setRulesModal] = useState<{
    eventName: string
    rules: string
  } | null>(null)
  const [confirmEvent, setConfirmEvent] =
    useState<TournamentEventForDisplay | null>(null)
  const [cancelConfirmEvent, setCancelConfirmEvent] =
    useState<TournamentEventForDisplay | null>(null)
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null)
  const [cancellingEventId, setCancellingEventId] = useState<string | null>(
    null,
  )
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

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
      <div className="rich-card p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">
          イベントがまだ作成されていません
        </p>
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

    if (state === "can_cancel") {
      setCancelConfirmEvent(event)
    }
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

  const handleCancelConfirm = async () => {
    if (!cancelConfirmEvent) return
    const eventId = cancelConfirmEvent.id
    setCancelConfirmEvent(null)
    setCancellingEventId(eventId)
    try {
      const res = await fetch("/api/entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      })
      const data = await res.json()

      if (data.success) {
        showToast("エントリーをキャンセルしました", "success")
        router.refresh()
      } else if (res.status === 401) {
        router.push("/login")
      } else {
        showToast(data.error || "キャンセルに失敗しました", "error")
      }
    } catch {
      showToast("キャンセルに失敗しました", "error")
    } finally {
      setCancellingEventId(null)
    }
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const isEntered = userEntries.includes(event.id)
        const buttonState = getEntryButtonState(
          event,
          isLoggedIn,
          isEntered,
          now,
          userGender,
        )
        const entryCount = event.entries[0]?.count ?? 0

        return (
          <div
            key={event.id}
            className={`rich-card p-5 opacity-0 ${isEntered ? "entered" : ""}`}
            style={{
              animation: `card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.08}s forwards`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-amber-100 text-primary font-bold text-sm">
                  {event.event_number}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {event.name}
                </h3>
                {event.gender && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      event.gender === "boys"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-pink-100 text-pink-700"
                    }`}
                  >
                    {event.gender === "boys" ? "Boys" : "Girls"}
                  </span>
                )}
              </div>
              {isEntered && (
                <span className="entry-badge">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  エントリー済
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
              <InfoRow
                icon={<GameIcon />}
                label="試合数"
                value={
                  event.match_format === "double_elimination"
                    ? "-"
                    : String(event.matches_per_event)
                }
              />
              <InfoRow
                icon={<UsersIcon />}
                label="参加上限"
                value={
                  event.max_participants
                    ? `${event.max_participants}人`
                    : "無制限"
                }
              />
              <InfoRow
                icon={<CalendarIcon />}
                label="開催日"
                value={formatDateJST(event.scheduled_date)}
                fullWidth
              />
              <InfoRow
                icon={<ClockIcon />}
                label="エントリー"
                value={`${formatDateTimeJST(event.entry_start)} 〜 ${formatDateTimeJST(event.entry_end)}`}
                fullWidth
              />
              <InfoRow
                icon={<CheckCircleIcon />}
                label="チェックイン"
                value={`${formatTimeJST(event.checkin_start)} 〜 ${formatTimeJST(event.checkin_end)}`}
                fullWidth
              />
              <div className="info-row sm:col-span-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <UserGroupIcon />
                  <span className="text-xs font-medium">エントリー人数</span>
                </div>
                <Link
                  href={`/tournaments/${tournamentId}/events/${event.id}/entries`}
                  className="ml-auto text-sm font-semibold text-primary hover:text-primary-hover transition-colors flex items-center gap-1 group"
                >
                  {entryCount}人
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setRulesModal({
                    eventName: event.name,
                    rules: event.rules ?? "",
                  })
                }
                className="glass-button flex-1 px-4 py-2.5 text-sm font-medium rounded-xl text-gray-700 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                ルール詳細
              </button>
              <EntryButton
                state={buttonState}
                onClick={() => handleButtonClick(buttonState, event)}
                loading={loadingEventId === event.id}
                cancelling={cancellingEventId === event.id}
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

      {cancelConfirmEvent && (
        <CancelConfirmModal
          event={cancelConfirmEvent}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelConfirmEvent(null)}
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

// Info row component
function InfoRow({
  icon,
  label,
  value,
  fullWidth = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  fullWidth?: boolean
}) {
  return (
    <div className={`info-row ${fullWidth ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="ml-auto text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

// Icons
function GameIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function UserGroupIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  )
}

// Entry button component
function EntryButton({
  state,
  onClick,
  loading = false,
  cancelling = false,
  className: additionalClassName = "",
}: {
  state: EntryButtonState
  onClick: () => void
  loading?: boolean
  cancelling?: boolean
  className?: string
}) {
  const label = cancelling
    ? "キャンセル中..."
    : loading
      ? "エントリー中..."
      : ENTRY_BUTTON_LABELS[state]

  const isDisabled =
    loading ||
    cancelling ||
    state === "invite" ||
    state === "before_start" ||
    state === "closed" ||
    state === "gender_mismatch"

  const isCancel = state === "can_cancel"
  const isActive = state === "can_entry" || state === "not_logged_in"

  let className =
    "px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"

  if (state === "invite" || state === "before_start" || state === "closed" || state === "gender_mismatch") {
    className += " bg-gray-100 text-gray-400 cursor-not-allowed"
  } else if (isCancel) {
    className += cancelling
      ? " bg-red-400 text-white cursor-not-allowed"
      : " bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0"
  } else if (isActive) {
    className += loading
      ? " glow-button text-white cursor-not-allowed opacity-70"
      : " glow-button text-white"
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
      {(loading || cancelling) && (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {label}
    </button>
  )
}

// Entry confirm modal
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
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="モーダルを閉じる"
      />
      <div
        className="relative modal-content rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden opacity-0"
        style={{
          animation: "card-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div className="px-6 py-5 border-b border-orange-100 bg-gradient-to-r from-primary/5 to-amber-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            エントリー確認
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 mb-4">
            以下のイベントにエントリーしますか？
          </p>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 space-y-2 border border-orange-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">イベント</span>
              <span className="font-semibold text-gray-900">{event.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">開催日</span>
              <span className="text-sm text-gray-700">
                {formatDateJST(event.scheduled_date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">チェックイン</span>
              <span className="text-sm text-gray-700">
                {formatTimeJST(event.checkin_start)} 〜{" "}
                {formatTimeJST(event.checkin_end)}
              </span>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-orange-100 flex gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="glass-button flex-1 px-4 py-2.5 text-sm font-medium rounded-xl text-gray-700"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="glow-button flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl text-white"
          >
            エントリーする
          </button>
        </div>
      </div>
    </div>
  )
}

// Cancel confirm modal
function CancelConfirmModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="モーダルを閉じる"
      />
      <div
        className="relative modal-content rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden opacity-0"
        style={{
          animation: "card-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div className="px-6 py-5 border-b border-red-100 bg-gradient-to-r from-red-50 to-orange-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
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
            </div>
            キャンセル確認
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 mb-4">
            以下のイベントのエントリーをキャンセルしますか？
          </p>
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 space-y-2 border border-red-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">イベント</span>
              <span className="font-semibold text-gray-900">{event.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">開催日</span>
              <span className="text-sm text-gray-700">
                {formatDateJST(event.scheduled_date)}
              </span>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-red-100 flex gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="glass-button flex-1 px-4 py-2.5 text-sm font-medium rounded-xl text-gray-700"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
          >
            キャンセルする
          </button>
        </div>
      </div>
    </div>
  )
}

// Rules modal
function RulesModal({
  eventName,
  rules,
  onClose,
}: {
  eventName: string
  rules: string
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
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="モーダルを閉じる"
      />
      <div
        className="relative modal-content rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden opacity-0"
        style={{
          animation: "card-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-orange-100 bg-gradient-to-r from-primary/5 to-amber-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            {eventName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="閉じる"
          >
            <svg
              className="w-5 h-5"
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
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
            {rules || "ルールが設定されていません。"}
          </pre>
        </div>
        <div className="px-6 py-4 border-t border-orange-100 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="glass-button w-full px-4 py-2.5 text-sm font-medium rounded-xl text-gray-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
