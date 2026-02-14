"use client"

import { Plus, Trash2 } from "lucide-react"
import type {
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
} from "react-hook-form"
import type { TournamentCreateFormData } from "@/lib/validations/tournament"

type QualifierFieldsProps = {
  fields: { id: string }[]
  append: UseFieldArrayAppend<TournamentCreateFormData, "qualifiers">
  remove: UseFieldArrayRemove
  register: UseFormRegister<TournamentCreateFormData>
  errors: FieldErrors<TournamentCreateFormData>
}

const EMPTY_QUALIFIER = {
  scheduled_date: "",
  entry_start: "",
  entry_end: "",
  checkin_start: "",
  checkin_end: "",
  rules: "",
}

export function QualifierFields({
  fields,
  append,
  remove,
  register,
  errors,
}: QualifierFieldsProps) {
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
              予選 {index + 1}
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
            {/* 開催日 */}
            <div>
              <label
                htmlFor={`qualifiers.${index}.scheduled_date`}
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
              >
                開催日
              </label>
              <input
                id={`qualifiers.${index}.scheduled_date`}
                type="date"
                {...register(`qualifiers.${index}.scheduled_date`)}
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
              {errors.qualifiers?.[index]?.scheduled_date && (
                <p className="mt-1 text-xs text-error">
                  {errors.qualifiers[index].scheduled_date.message}
                </p>
              )}
            </div>

            {/* エントリー開始/締切 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={`qualifiers.${index}.entry_start`}
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  エントリー開始
                </label>
                <input
                  id={`qualifiers.${index}.entry_start`}
                  type="datetime-local"
                  {...register(`qualifiers.${index}.entry_start`)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                {errors.qualifiers?.[index]?.entry_start && (
                  <p className="mt-1 text-xs text-error">
                    {errors.qualifiers[index].entry_start.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor={`qualifiers.${index}.entry_end`}
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  エントリー締切
                </label>
                <input
                  id={`qualifiers.${index}.entry_end`}
                  type="datetime-local"
                  {...register(`qualifiers.${index}.entry_end`)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                {errors.qualifiers?.[index]?.entry_end && (
                  <p className="mt-1 text-xs text-error">
                    {errors.qualifiers[index].entry_end.message}
                  </p>
                )}
              </div>
            </div>

            {/* チェックイン開始/締切 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={`qualifiers.${index}.checkin_start`}
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  チェックイン開始
                </label>
                <input
                  id={`qualifiers.${index}.checkin_start`}
                  type="datetime-local"
                  {...register(`qualifiers.${index}.checkin_start`)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                {errors.qualifiers?.[index]?.checkin_start && (
                  <p className="mt-1 text-xs text-error">
                    {errors.qualifiers[index].checkin_start.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor={`qualifiers.${index}.checkin_end`}
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  チェックイン締切
                </label>
                <input
                  id={`qualifiers.${index}.checkin_end`}
                  type="datetime-local"
                  {...register(`qualifiers.${index}.checkin_end`)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                {errors.qualifiers?.[index]?.checkin_end && (
                  <p className="mt-1 text-xs text-error">
                    {errors.qualifiers[index].checkin_end.message}
                  </p>
                )}
              </div>
            </div>

            {/* ルール */}
            <div>
              <label
                htmlFor={`qualifiers.${index}.rules`}
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
              >
                ルール
              </label>
              <textarea
                id={`qualifiers.${index}.rules`}
                {...register(`qualifiers.${index}.rules`)}
                rows={3}
                placeholder="予選固有のルールがあれば入力してください"
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-y"
              />
              <p className="mt-1 text-xs text-text-secondary">
                未設定の場合は大会ルールが適用されます
              </p>
            </div>
          </div>
        </section>
      ))}

      {/* 予選追加ボタン */}
      <button
        type="button"
        onClick={() => append(EMPTY_QUALIFIER)}
        className="w-full py-3 border-2 border-dashed border-border hover:border-primary/50 rounded-2xl text-text-secondary hover:text-primary flex items-center justify-center gap-2 transition-all duration-200"
      >
        <Plus className="w-4 h-4" />
        予選を追加
      </button>

      {/* 配列レベルのエラー */}
      {errors.qualifiers?.root && (
        <p className="text-xs text-error">{errors.qualifiers.root.message}</p>
      )}
    </div>
  )
}
