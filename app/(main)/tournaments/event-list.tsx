"use client"

import { FileText, Swords, Trophy } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Toast } from "@/app/components/toast"
import type {
  TournamentEventForDisplay,
  UserEntryInfo,
} from "@/lib/types/tournament"
import {
  formatDateJST,
  formatDateTimeJST,
  formatTimeJST,
} from "@/lib/utils/datetime"

import {
  CHECKIN_BUTTON_LABELS,
  type CheckinButtonState,
  getCheckinButtonState,
} from "./get-checkin-button-state"
import {
  ENTRY_BUTTON_LABELS,
  type EntryButtonState,
  getEntryButtonState,
} from "./get-entry-button-state"
import { EVENT_BADGE_LABELS, getEventBadgeState } from "./get-event-badge-state"
import {
  getLobbyButtonState,
  LOBBY_BUTTON_LABELS,
  type LobbyButtonState,
} from "./get-lobby-button-state"

type EventListProps = {
  tournamentId: string
  events: TournamentEventForDisplay[]
  isLoggedIn: boolean
  userEntries: UserEntryInfo[]
  userGender: string | null
  isAdmin: boolean
}

export function EventList({
  tournamentId,
  events,
  isLoggedIn,
  userEntries,
  userGender,
  isAdmin,
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
  const [checkinLoadingEventId, setCheckinLoadingEventId] = useState<
    string | null
  >(null)
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
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
          <svg
            className="h-6 w-6 text-[#d8a24c]"
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
        <p className="text-sm text-text-secondary">
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

  const handleCheckin = async (eventId: string) => {
    setCheckinLoadingEventId(eventId)
    try {
      const res = await fetch("/api/entries/checkin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      })
      const data = await res.json()

      if (data.success) {
        showToast("チェックインしました", "success")
        router.refresh()
      } else if (res.status === 401) {
        router.push("/login")
      } else {
        showToast(data.error || "チェックインに失敗しました", "error")
      }
    } catch {
      showToast("チェックインに失敗しました", "error")
    } finally {
      setCheckinLoadingEventId(null)
    }
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const entryInfo = userEntries.find((e) => e.event_id === event.id)
        const isEntered = !!entryInfo
        const badgeState = getEventBadgeState(event, entryInfo)
        const buttonState = getEntryButtonState(
          event,
          isLoggedIn,
          isEntered,
          now,
          userGender,
          isAdmin,
        )
        const entryCount = event.entries[0]?.count ?? 0
        const isStarted =
          event.status === "in_progress" || event.status === "completed"
        const displayCount = isStarted
          ? (event.participantCount ?? entryCount)
          : entryCount

        return (
          <div
            key={event.id}
            className={`rich-card p-5 opacity-0 ${isEntered ? "entered" : ""}`}
            style={{
              animation: `card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.08}s forwards`,
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d8a24c]/20 bg-white/5 text-sm font-black text-[#f2d7aa]">
                  {event.event_number}
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-[#f4efe6]">
                      {event.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setRulesModal({
                          eventName: event.name,
                          rules: event.rules ?? "",
                        })
                      }
                      className="flex items-center gap-1 rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-[#d8a24c]/20 hover:text-[#f4efe6]"
                      aria-label="ルール詳細"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Rules
                    </button>
                    {event.gender && (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          event.gender === "boys"
                            ? "border-sky-400/20 bg-sky-400/10 text-sky-200"
                            : "border-pink-400/20 bg-pink-400/10 text-pink-200"
                        }`}
                      >
                        {event.gender === "boys" ? "Boys" : "Girls"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8a24c]">
                    Event {event.event_number}
                  </p>
                </div>
              </div>
              {badgeState !== "none" && (
                <span className={`event-badge event-badge-${badgeState}`}>
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
                  {EVENT_BADGE_LABELS[badgeState]}
                </span>
              )}
            </div>

            <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              {event.entry_type !== "invite" && (
                <InfoRow
                  icon={<ClockIcon />}
                  label="エントリー"
                  value={`${formatDateTimeJST(event.entry_start)} 〜 ${formatDateTimeJST(event.entry_end)}`}
                  fullWidth
                />
              )}
              <InfoRow
                icon={<CheckCircleIcon />}
                label="チェックイン"
                value={`${formatTimeJST(event.checkin_start)} 〜 ${formatTimeJST(event.checkin_end)}`}
                fullWidth
              />
              <div className="info-row sm:col-span-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <UserGroupIcon />
                  <span className="text-xs font-medium">
                    {isStarted ? "参加者" : "エントリー人数"}
                  </span>
                </div>
                <Link
                  href={
                    isStarted
                      ? `/tournaments/${tournamentId}/events/${event.id}/ranking`
                      : `/tournaments/${tournamentId}/events/${event.id}/entries`
                  }
                  className="group ml-auto flex items-center gap-1 text-sm font-semibold text-[#f2d7aa] transition-colors hover:text-[#f4efe6]"
                >
                  {displayCount}人
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
              {event.match_format === "double_elimination" &&
                event.teamAssigned && (
                  <div className="info-row sm:col-span-2">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Swords className="w-4 h-4" />
                      <span className="text-xs font-medium">GFチーム</span>
                    </div>
                    <Link
                      href={`/tournaments/${tournamentId}/events/${event.id}/teams`}
                      className="group ml-auto flex items-center gap-1 text-sm font-semibold text-[#f2d7aa] transition-colors hover:text-[#f4efe6]"
                    >
                      チーム一覧
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
                )}
              {event.match_format === "double_elimination" &&
                event.bracketExists && (
                  <div className="info-row sm:col-span-2">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Trophy className="w-4 h-4" />
                      <span className="text-xs font-medium">トーナメント</span>
                    </div>
                    <Link
                      href={`/tournaments/${tournamentId}/events/${event.id}/bracket`}
                      className="group ml-auto flex items-center gap-1 text-sm font-semibold text-[#f2d7aa] transition-colors hover:text-[#f4efe6]"
                    >
                      トーナメント表
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
                )}
            </div>

            <div className="flex gap-3">
              <EntryButton
                state={buttonState}
                onClick={() => handleButtonClick(buttonState, event)}
                loading={loadingEventId === event.id}
                cancelling={cancellingEventId === event.id}
                className="flex-1"
              />
              <CheckinButton
                state={getCheckinButtonState(
                  event,
                  entryInfo?.checked_in_at ?? null,
                  now,
                  isEntered,
                )}
                onClick={() => handleCheckin(event.id)}
                loading={checkinLoadingEventId === event.id}
                className="flex-1"
              />
              <LobbyButton
                state={getLobbyButtonState(
                  isEntered,
                  entryInfo?.hasInProgressMatch ?? false,
                )}
                tournamentId={tournamentId}
                event={event}
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
      <div className="flex items-center gap-2 text-text-secondary">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="ml-auto text-right text-sm font-medium text-[#f4efe6]">
        {value}
      </span>
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
    "flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"

  if (
    state === "invite" ||
    state === "before_start" ||
    state === "closed" ||
    state === "gender_mismatch"
  ) {
    className +=
      " cursor-not-allowed border border-white/8 bg-white/5 text-stone-500"
  } else if (isCancel) {
    className += cancelling
      ? " cursor-not-allowed bg-red-400 text-white"
      : " border border-red-300/10 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-950/25 hover:-translate-y-0.5 hover:shadow-red-950/40 active:translate-y-0"
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

// Checkin button component
function CheckinButton({
  state,
  onClick,
  loading = false,
  className: additionalClassName = "",
}: {
  state: CheckinButtonState
  onClick: () => void
  loading?: boolean
  className?: string
}) {
  const label = loading ? "チェックイン中..." : CHECKIN_BUTTON_LABELS[state]
  const isDisabled = loading || state !== "can_checkin"

  let className =
    "flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"

  if (state === "checked_in") {
    className +=
      " cursor-not-allowed border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
  } else if (state === "can_checkin") {
    className += loading
      ? " glow-button text-white cursor-not-allowed opacity-70"
      : " glow-button text-white"
  } else {
    // not_entered / before_checkin / checkin_closed / event_started
    className +=
      " cursor-not-allowed border border-white/8 bg-white/5 text-stone-500"
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
      {loading && (
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

// Lobby button component
function LobbyButton({
  state,
  tournamentId,
  event,
  className: additionalClassName = "",
}: {
  state: LobbyButtonState
  tournamentId: string
  event: TournamentEventForDisplay
  className?: string
}) {
  const label = LOBBY_BUTTON_LABELS[state]
  const href =
    event.match_format === "double_elimination"
      ? `/tournaments/${tournamentId}/events/${event.id}/bracket`
      : `/tournaments/${tournamentId}/events/${event.id}/matches`

  if (state === "can_enter") {
    let className =
      "glow-button flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
    if (additionalClassName) className += ` ${additionalClassName}`

    return (
      <Link href={href} className={className}>
        <Swords className="w-4 h-4" />
        {label}
      </Link>
    )
  }

  let className =
    "flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-2.5 text-sm font-semibold text-stone-500 transition-all duration-200 cursor-not-allowed"
  if (additionalClassName) className += ` ${additionalClassName}`

  return (
    <button type="button" disabled className={className}>
      <Swords className="w-4 h-4" />
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
        <div className="border-b border-[#d8a24c]/10 bg-white/[0.02] px-6 py-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#f4efe6]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#d8a24c]">
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
          <p className="mb-4 text-sm text-text-secondary">
            以下のイベントにエントリーしますか？
          </p>
          <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              <span className="w-20 text-xs text-text-secondary">イベント</span>
              <span className="font-semibold text-[#f4efe6]">{event.name}</span>
            </div>
            {event.gender && (
              <div className="flex items-center gap-2">
                <span className="w-20 text-xs text-text-secondary">
                  性別区分
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    event.gender === "boys"
                      ? "bg-sky-400/10 text-sky-200"
                      : "bg-pink-400/10 text-pink-200"
                  }`}
                >
                  {event.gender === "boys" ? "Boys" : "Girls"}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-20 text-xs text-text-secondary">開催日</span>
              <span className="text-sm text-[#f4efe6]">
                {formatDateJST(event.scheduled_date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-xs text-text-secondary">
                チェックイン
              </span>
              <span className="text-sm text-[#f4efe6]">
                {formatTimeJST(event.checkin_start)} 〜{" "}
                {formatTimeJST(event.checkin_end)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-[#d8a24c]/10 bg-white/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="glass-button flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium text-[#f4efe6]"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="glow-button flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
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
        <div className="border-b border-primary/15 bg-primary/6 px-6 py-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#f4efe6]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700">
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
          <p className="mb-4 text-sm text-text-secondary">
            以下のイベントのエントリーをキャンセルしますか？
          </p>
          <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              <span className="w-20 text-xs text-text-secondary">イベント</span>
              <span className="font-semibold text-[#f4efe6]">{event.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-xs text-text-secondary">開催日</span>
              <span className="text-sm text-[#f4efe6]">
                {formatDateJST(event.scheduled_date)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-primary/15 bg-white/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="glass-button flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium text-[#f4efe6]"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-950/25 transition-all hover:shadow-red-950/40"
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
        <div className="flex items-center justify-between border-b border-[#d8a24c]/10 bg-white/[0.02] px-6 py-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#f4efe6]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#d8a24c]">
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
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-text-secondary transition-colors hover:bg-white/10 hover:text-[#f4efe6]"
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
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary">
            {rules || "ルールが設定されていません。"}
          </pre>
        </div>
        <div className="border-t border-[#d8a24c]/10 bg-white/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="glass-button w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-[#f4efe6]"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
