"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { Toast } from "@/app/components/toast"
import type { ActionResult, TournamentGender } from "@/lib/types/tournament"
import { TOURNAMENT_GENDER_LABELS } from "@/lib/types/tournament"
import {
  type TournamentCreateFormData,
  tournamentCreateSchema,
} from "@/lib/validations/tournament"
import { QualifierFields } from "./qualifier-fields"

export function TournamentForm() {
  const router = useRouter()
  const [state, setState] = useState<ActionResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showSuccess, setShowSuccess] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TournamentCreateFormData>({
    resolver: zodResolver(tournamentCreateSchema),
    defaultValues: {
      name: "",
      gender: undefined,
      matches_per_qualifier: 5,
      gf_advance_count: 20,
      max_participants: undefined,
      rules: "",
      qualifiers: [
        {
          scheduled_date: "",
          entry_start: "",
          entry_end: "",
          checkin_start: "",
          checkin_end: "",
          rules: "",
        },
      ],
    },
    mode: "onChange",
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "qualifiers",
  })

  // 成功時のトーストとリダイレクト
  useEffect(() => {
    if (state?.success) {
      setShowSuccess(true)
      setIsExiting(false)
      const exitTimer = setTimeout(() => setIsExiting(true), 2500)
      const redirectTimer = setTimeout(() => {
        router.push("/admin/tournaments")
      }, 3000)
      return () => {
        clearTimeout(exitTimer)
        clearTimeout(redirectTimer)
      }
    }
  }, [state, router])

  // フォーム送信処理
  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const result: ActionResult = await response.json()
        setState(result)
      } catch (e) {
        setState({
          success: false,
          error: `通信エラー: ${e instanceof Error ? e.message : String(e)}`,
        })
      }
    })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 大会基本情報 */}
      <section className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <span className="w-1.5 h-5 bg-primary rounded-full" />
            大会基本情報
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {/* 大会名 */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
            >
              大会名
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              placeholder="例: 第1回 Jiro-Rimi Cup"
              className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-error">{errors.name.message}</p>
            )}
          </div>

          {/* 性別 */}
          <div>
            <span className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              カテゴリ
            </span>
            <div className="flex gap-3">
              {(["boys", "girls"] as const).map((gender: TournamentGender) => (
                <label key={gender} className="relative cursor-pointer flex-1">
                  <input
                    type="radio"
                    {...register("gender")}
                    value={gender}
                    className="peer sr-only"
                  />
                  <div
                    className={`py-2.5 rounded-xl border-2 text-center transition-all duration-200 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-md ${
                      gender === "boys"
                        ? "border-blue-200 hover:border-blue-300 bg-blue-50/50"
                        : "border-pink-200 hover:border-pink-300 bg-pink-50/50"
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {TOURNAMENT_GENDER_LABELS[gender]}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            {errors.gender && (
              <p className="mt-1 text-xs text-error">{errors.gender.message}</p>
            )}
          </div>

          {/* 予選試合数 / GF進出人数 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="matches_per_qualifier"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
              >
                予選試合数
              </label>
              <input
                id="matches_per_qualifier"
                type="number"
                {...register("matches_per_qualifier", { valueAsNumber: true })}
                min={1}
                max={10}
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
              {errors.matches_per_qualifier && (
                <p className="mt-1 text-xs text-error">
                  {errors.matches_per_qualifier.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="gf_advance_count"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
              >
                GF進出人数
              </label>
              <input
                id="gf_advance_count"
                type="number"
                {...register("gf_advance_count", { valueAsNumber: true })}
                min={1}
                max={100}
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
              {errors.gf_advance_count && (
                <p className="mt-1 text-xs text-error">
                  {errors.gf_advance_count.message}
                </p>
              )}
            </div>
          </div>

          {/* 参加上限 */}
          <div>
            <label
              htmlFor="max_participants"
              className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
            >
              参加上限（任意）
            </label>
            <input
              id="max_participants"
              type="number"
              {...register("max_participants", { valueAsNumber: true })}
              min={1}
              placeholder="未設定の場合は上限なし"
              className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
            {errors.max_participants && (
              <p className="mt-1 text-xs text-error">
                {errors.max_participants.message}
              </p>
            )}
          </div>

          {/* ルール */}
          <div>
            <label
              htmlFor="rules"
              className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
            >
              大会ルール（任意）
            </label>
            <textarea
              id="rules"
              {...register("rules")}
              rows={4}
              placeholder="大会共通のルールを入力してください"
              className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-y"
            />
          </div>
        </div>
      </section>

      {/* 予選設定 */}
      <QualifierFields
        fields={fields}
        append={append}
        remove={remove}
        register={register}
        errors={errors}
      />

      {/* エラー表示 */}
      {state && !state.success && (
        <div className="p-4 bg-red-50 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{state.error}</p>
        </div>
      )}

      {/* 成功トースト */}
      <Toast
        message="大会を作成しました！"
        show={showSuccess}
        isExiting={isExiting}
      />

      {/* ボタン */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/tournaments")}
          className="flex-1 py-3 border border-border text-text-secondary font-medium rounded-lg hover:bg-gray-50 transition-all duration-200"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
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
              保存中...
            </span>
          ) : (
            "保存"
          )}
        </button>
      </div>
    </form>
  )
}
