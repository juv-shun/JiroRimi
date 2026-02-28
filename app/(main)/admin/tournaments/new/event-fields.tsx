"use client"

import Link from "next/link"
import { useState } from "react"
import { CircleDot, CheckCircle2, ClipboardCheck, Loader2, Play, Plus, Trash2, Users } from "lucide-react"
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
    } else if (value === "qualifier") {
      setValue(`events.${index}.matches_per_event`, 5)
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <section
          key={field.id}
          className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden"
        >
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-success/10 via-success/5 to-transparent px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-5 bg-success rounded-full" />
              イベント {index + 1}
            </h3>
            <div className="flex items-center gap-1.5">
              {(() => {
                const eventId = mode === "edit" ? watch(`events.${index}.eventId`) : undefined
                if (mode !== "edit" || !tournamentId || !eventId) return null
                const status = eventStatuses?.[eventId]
                return (
                  <>
                    <Link
                      href={`/admin/tournaments/${tournamentId}/events/${eventId}/checkin`}
                      className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors duration-200"
                      title="チェックイン管理"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                    </Link>
                    {status === "scheduled" && (
                      <button
                        type="button"
                        onClick={() => handleStartClick(eventId)}
                        disabled={loadingEventId === eventId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 disabled:opacity-50 transition-all"
                        title="イベントを開始"
                      >
                        {loadingEventId === eventId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        開始
                      </button>
                    )}
                    {status === "in_progress" && (
                      <>
                        <Link
                          href={`/admin/tournaments/${tournamentId}/events/${eventId}/team-assignment`}
                          className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors duration-200"
                          title="チーム編成"
                        >
                          <Users className="w-4 h-4" />
                        </Link>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <CircleDot className="w-3 h-3" />
                          進行中
                        </span>
                      </>
                    )}
                    {status === "completed" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
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
                  className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* イベント名 */}
            <div>
              <label
                htmlFor={`events.${index}.name`}
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
              >
                イベント名
              </label>
              <input
                id={`events.${index}.name`}
                type="text"
                {...register(`events.${index}.name`)}
                placeholder="例: 予選1"
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
              {errors.events?.[index]?.name && (
                <p className="mt-1 text-xs text-error">
                  {errors.events[index].name.message}
                </p>
              )}
            </div>

            {/* エントリー方式 / 進行形式 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={`events.${index}.entry_type`}
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  エントリー方式
                </label>
                <select
                  id={`events.${index}.entry_type`}
                  {...register(`events.${index}.entry_type`)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
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
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const matchFormat = watch(`events.${index}.match_format`)
                const isDoubleElimination = matchFormat === "double_elimination"
                return (
                  <div>
                    <label
                      htmlFor={`events.${index}.matches_per_event`}
                      className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
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
                      className={`w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 ${
                        isDoubleElimination
                          ? "bg-gray-100 cursor-not-allowed opacity-60"
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
              <div>
                <label
                  htmlFor={`events.${index}.max_participants`}
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  参加上限（任意）
                </label>
                <input
                  id={`events.${index}.max_participants`}
                  type="number"
                  {...register(`events.${index}.max_participants`, {
                    valueAsNumber: true,
                  })}
                  min={1}
                  placeholder="上限なし"
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                {errors.events?.[index]?.max_participants && (
                  <p className="mt-1 text-xs text-error">
                    {errors.events[index].max_participants.message}
                  </p>
                )}
              </div>
            </div>

            {/* 開催日 */}
            <div>
              <label
                htmlFor={`events.${index}.scheduled_date`}
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
              >
                開催日
              </label>
              <input
                id={`events.${index}.scheduled_date`}
                type="date"
                {...register(`events.${index}.scheduled_date`)}
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
              {errors.events?.[index]?.scheduled_date && (
                <p className="mt-1 text-xs text-error">
                  {errors.events[index].scheduled_date.message}
                </p>
              )}
            </div>

            {/* エントリー開始/締切 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={`events.${index}.entry_start`}
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  エントリー開始
                </label>
                <input
                  id={`events.${index}.entry_start`}
                  type="datetime-local"
                  {...register(`events.${index}.entry_start`)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                {errors.events?.[index]?.entry_start && (
                  <p className="mt-1 text-xs text-error">
                    {errors.events[index].entry_start.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor={`events.${index}.entry_end`}
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  エントリー締切
                </label>
                <input
                  id={`events.${index}.entry_end`}
                  type="datetime-local"
                  {...register(`events.${index}.entry_end`)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                {errors.events?.[index]?.entry_end && (
                  <p className="mt-1 text-xs text-error">
                    {errors.events[index].entry_end.message}
                  </p>
                )}
              </div>
            </div>

            {/* チェックイン開始/締切 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={`events.${index}.checkin_start`}
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  チェックイン開始
                </label>
                <input
                  id={`events.${index}.checkin_start`}
                  type="datetime-local"
                  {...register(`events.${index}.checkin_start`)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  チェックイン締切
                </label>
                <input
                  id={`events.${index}.checkin_end`}
                  type="datetime-local"
                  {...register(`events.${index}.checkin_end`)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
              >
                性別区分
              </label>
              <select
                id={`events.${index}.gender`}
                {...register(`events.${index}.gender`, {
                  setValueAs: (v) => (v === "" ? null : v),
                })}
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
              >
                ルール
              </label>
              <textarea
                id={`events.${index}.rules`}
                {...register(`events.${index}.rules`)}
                rows={3}
                placeholder="このイベントのルールを入力してください"
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-y"
              />
              <p className="mt-1 text-xs text-text-secondary">任意</p>
            </div>
          </div>
        </section>
      ))}

      {/* 予選追加ボタン */}
      <button
        type="button"
        onClick={() => append(EMPTY_EVENT)}
        className="w-full py-3 border-2 border-dashed border-border hover:border-primary/50 rounded-2xl text-text-secondary hover:text-primary flex items-center justify-center gap-2 transition-all duration-200"
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
