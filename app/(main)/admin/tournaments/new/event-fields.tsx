"use client"

import { Plus, Trash2 } from "lucide-react"
import type {
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
} from "react-hook-form"
import {
  ENTRY_TYPE_LABELS,
  MATCH_FORMAT_LABELS,
} from "@/lib/types/tournament"
import type { EntryType, MatchFormat } from "@/lib/types/tournament"
import type { TournamentUpdateFormData } from "@/lib/validations/tournament"

type EventFieldsProps = {
  fields: { id: string }[]
  append: UseFieldArrayAppend<TournamentUpdateFormData, "events">
  remove: UseFieldArrayRemove
  register: UseFormRegister<TournamentUpdateFormData>
  errors: FieldErrors<TournamentUpdateFormData>
}

const EMPTY_EVENT = {
  name: "",
  entry_type: "open" as EntryType,
  match_format: "swiss" as MatchFormat,
  matches_per_event: 5,
  max_participants: undefined as number | undefined,
  scheduled_date: "",
  entry_start: "",
  entry_end: "",
  checkin_start: "",
  checkin_end: "",
  rules: "",
}

export function EventFields({
  fields,
  append,
  remove,
  register,
  errors,
}: EventFieldsProps) {
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
                  {...register(`events.${index}.match_format`)}
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
                    valueAsNumber: true,
                  })}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                {errors.events?.[index]?.matches_per_event && (
                  <p className="mt-1 text-xs text-error">
                    {errors.events[index].matches_per_event.message}
                  </p>
                )}
              </div>
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
              <p className="mt-1 text-xs text-text-secondary">
                任意
              </p>
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
    </div>
  )
}
