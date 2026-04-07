"use client"

import Link from "next/link"
import { useState } from "react"
import { CircleDot, CheckCircle2, ClipboardCheck, Loader2, Play, Plus, Swords, Trash2 } from "lucide-react"
import type {
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form"
import { Toast } from "@/app/components/toast"
import { createClient } from "@/lib/supabase/client"
import type { EntryWithProfile } from "@/lib/types/entry"
import { GENDER_LABELS } from "@/lib/types/profile"
import { ENTRY_TYPE_LABELS, MATCH_FORMAT_LABELS } from "@/lib/types/tournament"
import type { EntryType, EventStatus, MatchFormat } from "@/lib/types/tournament"
import type { TournamentUpdateFormData } from "@/lib/validations/tournament"
import { StartEventModal } from "@/app/components/start-event-modal"

type EventFieldsProps = {
  fields: { id: string }[]
  append: UseFieldArrayAppend<TournamentUpdateFormData, "events">
  remove: UseFieldArrayRemove
  register: UseFormRegister<TournamentUpdateFormData>
  errors: FieldErrors<TournamentUpdateFormData>
  watch: UseFormWatch<TournamentUpdateFormData>
  setValue: UseFormSetValue<TournamentUpdateFormData>
  mode?: "create" | "edit"
  tournamentId?: string
  eventStatuses?: Record<string, EventStatus>
}

const EMPTY_EVENT = {
  name: "",
  entry_type: "open" as EntryType,
  match_format: "qualifier" as MatchFormat,
  matches_per_event: 5 as number | null,
  max_participants: undefined as number | undefined,
  scheduled_date: "",
  entry_start: "",
  entry_end: "",
  checkin_start: "",
  checkin_end: "",
  gender: null as "boys" | "girls" | null,
  rules: "",
}

export function EventFields({
  fields,
  append,
  remove,
  register,
  errors,
  watch,
  setValue,
  mode,
  tournamentId,
  eventStatuses,
}: EventFieldsProps) {
  const [startModalState, setStartModalState] = useState<{
    eventId: string
    entries: EntryWithProfile[]
  } | null>(null)
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: "success" | "error"
    isExiting: boolean
  }>({ show: false, message: "", type: "success", isExiting: false })

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type, isExiting: false })
    setTimeout(() => setToast((prev) => ({ ...prev, isExiting: true })), 2500)
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success", isExiting: false })
    }, 3000)
  }

  const handleStartClick = async (eventId: string) => {
    setLoadingEventId(eventId)
    try {
      const supabase = createClient()
      const { data: entries, error } = await supabase
        .from("entries")
        .select(
          "id, created_at, checked_in_at, profiles (player_name, avatar_url, first_role, second_role, third_role)",
        )
        .eq("event_id", eventId)
        .not("checked_in_at", "is", null)

      if (error) {
        showToast("エントリーの取得に失敗しました", "error")
        return
      }

      const entryList: EntryWithProfile[] = (entries ?? []).map((entry) => ({
        id: entry.id,
        created_at: entry.created_at,
        checked_in_at: entry.checked_in_at,
        profiles: Array.isArray(entry.profiles)
          ? entry.profiles[0] ?? null
          : entry.profiles,
      }))

      setStartModalState({ eventId, entries: entryList })
    } catch {
      showToast("通信エラーが発生しました", "error")
    } finally {
      setLoadingEventId(null)
    }
  }

  // match_format 変更時のハンドラ
  const handleMatchFormatChange = (index: number, value: MatchFormat) => {
    if (value === "double_elimination") {
      setValue(`events.${index}.matches_per_event`, null)
      setValue(`events.${index}.max_participants`, 20)
    } else if (value === "qualifier") {
      setValue(`events.${index}.matches_per_event`, 5)
    }
  }

  // entry_type 変更時のハンドラ
  const handleEntryTypeChange = (index: number, value: EntryType) => {
    if (value === "invite") {
      setValue(`events.${index}.entry_start`, "")
      setValue(`events.${index}.entry_end`, "")
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <section
          key={field.id}
          className="rich-card overflow-hidden rounded-2xl"
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-[#d8a24c]/10 bg-gradient-to-r from-success/12 via-success/6 to-transparent px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
              <span className="h-5 w-1.5 rounded-full bg-success" />
              イベント {index + 1}
            </h3>
            <div className="flex items-center gap-1.5">
              {(() => {
                const eventId = mode === "edit" ? watch(`events.${index}.eventId`) : undefined
                if (mode !== "edit" || !tournamentId || !eventId) return null
                const status = eventStatuses?.[eventId]
                return (
                  <>
                    {status === "in_progress" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/12 px-2.5 py-1 text-xs font-medium text-rose-200">
                        <CircleDot className="w-3 h-3" />
                        進行中
                      </span>
                    )}
                    {status === "completed" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#d8a24c]/20 bg-[#d8a24c]/10 px-2.5 py-1 text-xs font-medium text-[#f2d7aa]">
                        <CheckCircle2 className="w-3 h-3" />
                        終了
                      </span>
                    )}
                  </>
                )
              })()}
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-lg p-1.5 text-text-secondary transition-colors duration-200 hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <input type="hidden" {...register(`events.${index}.eventId`)} />
            {/* イベント名 */}
            <div>
              <label
                htmlFor={`events.${index}.name`}
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
              >
                イベント名
              </label>
              <input
                id={`events.${index}.name`}
                type="text"
                {...register(`events.${index}.name`)}
                placeholder="例: 予選1"
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.events?.[index]?.name && (
                <p className="mt-1 text-xs text-error">
                  {errors.events[index].name.message}
                </p>
              )}
            </div>

            {/* エントリー方式 / 進行形式 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`events.${index}.entry_type`}
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                  エントリー方式
                </label>
                <select
                  id={`events.${index}.entry_type`}
                  {...register(`events.${index}.entry_type`, {
                    onChange: (e) =>
                      handleEntryTypeChange(
                        index,
                        e.target.value as EntryType,
                      ),
                  })}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.events?.[index]?.entry_type && (
                  <p className="mt-1 text-xs text-error">
                    {errors.events[index].entry_type.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor={`events.${index}.match_format`}
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                  進行形式
                </label>
                <select
                  id={`events.${index}.match_format`}
                  {...register(`events.${index}.match_format`, {
                    onChange: (e) =>
                      handleMatchFormatChange(
                        index,
                        e.target.value as MatchFormat,
                      ),
                  })}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(MATCH_FORMAT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.events?.[index]?.match_format && (
                  <p className="mt-1 text-xs text-error">
                    {errors.events[index].match_format.message}
                  </p>
                )}
              </div>
            </div>

            {/* 試合数 / 参加上限 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(() => {
                const matchFormat = watch(`events.${index}.match_format`)
                const isDoubleElimination = matchFormat === "double_elimination"
                return (
                  <div>
                    <label
                      htmlFor={`events.${index}.matches_per_event`}
                      className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
                    >
                      試合数
                    </label>
                    <input
                      id={`events.${index}.matches_per_event`}
                      type="number"
                      {...register(`events.${index}.matches_per_event`, {
                        setValueAs: (v) => {
                          if (v === "" || v === null || v === undefined)
                            return null
                          const num = Number(v)
                          return Number.isNaN(num) ? null : num
                        },
                      })}
                      min={1}
                      max={10}
                      disabled={isDoubleElimination}
                      className={`w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        isDoubleElimination
                          ? "cursor-not-allowed bg-white/[0.03] opacity-60"
                          : ""
                      }`}
                    />
                    {isDoubleElimination && (
                      <p className="mt-1 text-xs text-text-secondary">
                        ダブルエリミネーション形式では試合数は自動決定されます
                      </p>
                    )}
                    {errors.events?.[index]?.matches_per_event && (
                      <p className="mt-1 text-xs text-error">
                        {errors.events[index].matches_per_event.message}
                      </p>
                    )}
                  </div>
                )
              })()}
              {(() => {
                const matchFormat = watch(`events.${index}.match_format`)
                const isDoubleElimination = matchFormat === "double_elimination"
                return (
                  <div>
                    <label
                      htmlFor={`events.${index}.max_participants`}
                      className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
                    >
                      参加上限{isDoubleElimination ? "" : "（任意）"}
                    </label>
                    <input
                      id={`events.${index}.max_participants`}
                      type="number"
                      {...register(`events.${index}.max_participants`, {
                        valueAsNumber: true,
                      })}
                      min={1}
                      placeholder="上限なし"
                      disabled={isDoubleElimination}
                      className={`w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        isDoubleElimination
                          ? "cursor-not-allowed bg-white/[0.03] opacity-60"
                          : ""
                      }`}
                    />
                    {isDoubleElimination && (
                      <p className="mt-1 text-xs text-text-secondary">
                        ダブルエリミネーション形式では20人固定です
                      </p>
                    )}
                    {errors.events?.[index]?.max_participants && (
                      <p className="mt-1 text-xs text-error">
                        {errors.events[index].max_participants.message}
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* 開催日 */}
            <div>
              <label
                htmlFor={`events.${index}.scheduled_date`}
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
              >
                開催日
              </label>
              <input
                id={`events.${index}.scheduled_date`}
                type="date"
                {...register(`events.${index}.scheduled_date`)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.events?.[index]?.scheduled_date && (
                <p className="mt-1 text-xs text-error">
                  {errors.events[index].scheduled_date.message}
                </p>
              )}
            </div>

            {/* エントリー開始/締切 */}
            {(() => {
              const entryType = watch(`events.${index}.entry_type`)
              const isInvite = entryType === "invite"
              return (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`events.${index}.entry_start`}
                      className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
                    >
                      エントリー開始
                    </label>
                    <input
                      id={`events.${index}.entry_start`}
                      type="datetime-local"
                      {...register(`events.${index}.entry_start`)}
                      disabled={isInvite}
                      className={`w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        isInvite ? "cursor-not-allowed bg-white/[0.03] opacity-60" : ""
                      }`}
                    />
                    {isInvite && (
                      <p className="mt-1 text-xs text-text-secondary">
                        招待制では不要です
                      </p>
                    )}
                    {errors.events?.[index]?.entry_start && (
                      <p className="mt-1 text-xs text-error">
                        {errors.events[index].entry_start.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor={`events.${index}.entry_end`}
                      className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
                    >
                      エントリー締切
                    </label>
                    <input
                      id={`events.${index}.entry_end`}
                      type="datetime-local"
                      {...register(`events.${index}.entry_end`)}
                      disabled={isInvite}
                      className={`w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        isInvite ? "cursor-not-allowed bg-white/[0.03] opacity-60" : ""
                      }`}
                    />
                    {errors.events?.[index]?.entry_end && (
                      <p className="mt-1 text-xs text-error">
                        {errors.events[index].entry_end.message}
                      </p>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* チェックイン開始/締切 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`events.${index}.checkin_start`}
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                  チェックイン開始
                </label>
                <input
                  id={`events.${index}.checkin_start`}
                  type="datetime-local"
                  {...register(`events.${index}.checkin_start`)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {errors.events?.[index]?.checkin_start && (
                  <p className="mt-1 text-xs text-error">
                    {errors.events[index].checkin_start.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor={`events.${index}.checkin_end`}
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                  チェックイン締切
                </label>
                <input
                  id={`events.${index}.checkin_end`}
                  type="datetime-local"
                  {...register(`events.${index}.checkin_end`)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {errors.events?.[index]?.checkin_end && (
                  <p className="mt-1 text-xs text-error">
                    {errors.events[index].checkin_end.message}
                  </p>
                )}
              </div>
            </div>

            {/* 性別区分 */}
            <div>
              <label
                htmlFor={`events.${index}.gender`}
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
              >
                性別区分
              </label>
              <select
                id={`events.${index}.gender`}
                {...register(`events.${index}.gender`, {
                  setValueAs: (v) => (v === "" ? null : v),
                })}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">制限なし</option>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-secondary">
                設定すると該当の性別のみエントリー可能になります
              </p>
              {errors.events?.[index]?.gender && (
                <p className="mt-1 text-xs text-error">
                  {errors.events[index].gender.message}
                </p>
              )}
            </div>

            {/* ルール */}
            <div>
              <label
                htmlFor={`events.${index}.rules`}
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
              >
                ルール
              </label>
              <textarea
                id={`events.${index}.rules`}
                {...register(`events.${index}.rules`)}
                rows={3}
                placeholder="このイベントのルールを入力してください"
                className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-xs text-text-secondary">任意</p>
            </div>

            {/* アクションボタン */}
            {(() => {
              const eventId = mode === "edit" ? watch(`events.${index}.eventId`) : undefined
              if (mode !== "edit" || !tournamentId || !eventId) return null
              const status = eventStatuses?.[eventId]
              return (
                <div className="flex flex-wrap items-center gap-3 border-t border-[#d8a24c]/10 pt-4">
                  <Link
                    href={`/admin/tournaments/${tournamentId}/events/${eventId}/checkin`}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-secondary transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-[#ffd7dc]"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    チェックイン管理
                  </Link>
                  {status === "scheduled" && (
                    <button
                      type="button"
                      onClick={() => handleStartClick(eventId)}
                      disabled={loadingEventId === eventId}
                      className="glow-button inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 disabled:opacity-50"
                    >
                      {loadingEventId === eventId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      イベントを開始
                    </button>
                  )}
                  {status === "in_progress" && (
                    <Link
                      href={`/admin/tournaments/${tournamentId}/events/${eventId}/matches`}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-[#ffd7dc] transition-all duration-200 hover:bg-primary/15"
                    >
                      <Swords className="w-4 h-4" />
                      試合管理
                    </Link>
                  )}
                </div>
              )
            })()}
          </div>
        </section>
      ))}

      {/* 予選追加ボタン */}
      <button
        type="button"
        onClick={() => append(EMPTY_EVENT)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 py-3 text-text-secondary transition-all duration-200 hover:border-primary/35 hover:bg-primary/8 hover:text-[#ffd7dc]"
      >
        <Plus className="w-4 h-4" />
        イベントを追加
      </button>

      {/* 配列レベルのエラー */}
      {errors.events?.root && (
        <p className="text-xs text-error">{errors.events.root.message}</p>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        isExiting={toast.isExiting}
      />

      {startModalState && (
        <StartEventModal
          eventId={startModalState.eventId}
          entries={startModalState.entries}
          onClose={() => setStartModalState(null)}
          onSuccess={() => {
            setStartModalState(null)
            showToast("イベントを開始しました", "success")
            // ステータスをローカルで更新（ページリロードなしで反映）
            if (eventStatuses && startModalState) {
              eventStatuses[startModalState.eventId] = "in_progress"
            }
          }}
        />
      )}
    </div>
  )
}
