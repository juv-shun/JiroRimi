"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { useFieldArray, useForm } from "react-hook-form"
import { Toast } from "@/app/components/toast"
import type { ActionResult } from "@/lib/types/tournament"
import {
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
} from "@/lib/types/tournament"
import {
  type TournamentUpdateFormData,
  tournamentUpdateSchema,
} from "@/lib/validations/tournament"
import { EventFields } from "./event-fields"

type TournamentFormProps = {
  mode: "create" | "edit"
  tournamentId?: string
  defaultValues?: TournamentUpdateFormData
}

export function TournamentForm({
  mode,
  tournamentId,
  defaultValues,
}: TournamentFormProps) {
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
  } = useForm<TournamentUpdateFormData>({
    resolver: zodResolver(tournamentUpdateSchema),
    defaultValues: defaultValues ?? {
      name: "",
      status: "draft",
      events: [
        {
          name: "",
          entry_type: "open",
          match_format: "swiss",
          matches_per_event: 5,
          max_participants: undefined,
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
    name: "events",
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
        const url =
          mode === "create"
            ? "/api/tournaments"
            : `/api/tournaments/${tournamentId}`
        const method = mode === "create" ? "POST" : "PUT"

        const response = await fetch(url, {
          method,
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

  // 公開ボタン処理
  const onPublish = handleSubmit((data) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, status: "open" }),
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

  const toastMessage =
    mode === "create" ? "大会を作成しました！" : "大会を更新しました！"

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

          {/* ステータス（編集時のみ） */}
          {mode === "edit" && (
            <div>
              <label
                htmlFor="status"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
              >
                ステータス
              </label>
              <select
                id="status"
                {...register("status")}
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              >
                {Object.entries(TOURNAMENT_STATUS_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              {errors.status && (
                <p className="mt-1 text-xs text-error">
                  {errors.status.message}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 予選設定 */}
      <EventFields
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
      <Toast message={toastMessage} show={showSuccess} isExiting={isExiting} />

      {/* ボタン */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/tournaments")}
          className="flex-1 py-3 border border-border text-text-secondary font-medium rounded-lg hover:bg-gray-50 transition-all duration-200"
        >
          キャンセル
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={onPublish}
            disabled={isPending}
            className="flex-1 py-3 bg-success hover:bg-success/90 disabled:bg-gray-300 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
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
                処理中...
              </span>
            ) : (
              "公開"
            )}
          </button>
        )}
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
