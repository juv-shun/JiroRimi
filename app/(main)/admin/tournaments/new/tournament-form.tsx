"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { useFieldArray, useForm } from "react-hook-form"
import { Toast } from "@/app/components/toast"
import type { ActionResult, EventStatus } from "@/lib/types/tournament"
import type { TournamentStatus } from "@/lib/types/tournament"
import {
  type TournamentUpdateFormData,
  tournamentUpdateSchema,
} from "@/lib/validations/tournament"
import { EventFields } from "./event-fields"

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "下書き",
  open: "公開中",
  in_progress: "進行中",
  completed: "終了",
}

const STATUS_BADGE_STYLES: Record<TournamentStatus, string> = {
  draft:
    "inline-block rounded-full bg-white/5 px-3 py-1 text-sm font-medium text-stone-300 border border-white/10",
  open: "inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300 border border-emerald-400/20",
  in_progress:
    "inline-block rounded-full bg-primary/12 px-3 py-1 text-sm font-medium text-rose-200 border border-primary/25",
  completed:
    "inline-block rounded-full bg-[#d8a24c]/10 px-3 py-1 text-sm font-medium text-[#f2d7aa] border border-[#d8a24c]/20",
}

type TournamentFormProps = {
  mode: "create" | "edit"
  tournamentId?: string
  defaultValues?: TournamentUpdateFormData
  eventStatuses?: Record<string, EventStatus>
}

export function TournamentForm({
  mode,
  tournamentId,
  defaultValues,
  eventStatuses,
}: TournamentFormProps) {
  const router = useRouter()
  const initialStatus: TournamentStatus = defaultValues?.status ?? "draft"
  const [state, setState] = useState<ActionResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showSuccess, setShowSuccess] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
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
          match_format: "qualifier",
          matches_per_event: 5,
          max_participants: undefined,
          scheduled_date: "",
          entry_start: "",
          entry_end: "",
          checkin_start: "",
          checkin_end: "",
          gender: null,
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

  // ステータス変更ボタン処理（公開 / 非公開化）
  const onStatusChange = (newStatus: TournamentStatus) =>
    handleSubmit((data) => {
      startTransition(async () => {
        try {
          const response = await fetch(`/api/tournaments/${tournamentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, status: newStatus }),
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
    })()

  const toastMessage =
    mode === "create" ? "大会を作成しました！" : "大会を更新しました！"

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 大会基本情報 */}
      <section className="rich-card overflow-hidden rounded-2xl">
        <div className="border-b border-[#d8a24c]/10 bg-gradient-to-r from-primary/12 via-primary/6 to-transparent px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <span className="h-5 w-1.5 rounded-full bg-primary" />
            大会基本情報
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {/* 大会名 */}
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary"
            >
              大会名
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              placeholder="例: 第1回 Jiro-Rimi Cup"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-error">{errors.name.message}</p>
            )}
          </div>

          {/* ステータス表示（編集時のみ） */}
          {mode === "edit" && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                ステータス
              </label>
              <input type="hidden" {...register("status")} />
              <span className={STATUS_BADGE_STYLES[initialStatus]}>
                {STATUS_LABELS[initialStatus]}
              </span>
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
        watch={watch}
        setValue={setValue}
        mode={mode}
        tournamentId={tournamentId}
        eventStatuses={eventStatuses}
      />

      {/* エラー表示 */}
      {state && !state.success && (
        <div className="rounded-lg border border-error/20 bg-error/10 p-4">
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
          className="glass-button flex-1 rounded-2xl py-3 font-medium text-text-primary transition-all duration-200"
        >
          キャンセル
        </button>
        {/* draft → 公開ボタン */}
        {mode === "edit" && initialStatus === "draft" && (
          <StatusButton
            label="公開"
            isPending={isPending}
            onClick={() => onStatusChange("open")}
            className="bg-success hover:bg-success/90"
          />
        )}
        {/* open / in_progress → 非公開化ボタン */}
        {mode === "edit" &&
          (initialStatus === "open" || initialStatus === "in_progress") && (
            <StatusButton
              label="非公開化"
              isPending={isPending}
              onClick={() => onStatusChange("draft")}
              className="bg-warning hover:bg-warning/90"
            />
          )}
        <button
          type="submit"
          disabled={isPending}
          className="glow-button flex-1 rounded-2xl py-3 font-medium text-white transition-all duration-200 disabled:bg-stone-500 disabled:shadow-none"
        >
          {isPending ? <SpinnerLabel text="保存中..." /> : "保存"}
        </button>
      </div>
    </form>
  )
}

function SpinnerLabel({ text }: { text: string }) {
  return (
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
      {text}
    </span>
  )
}

function StatusButton({
  label,
  isPending,
  onClick,
  className,
}: {
  label: string
  isPending: boolean
  onClick: () => void
  className: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`flex-1 rounded-2xl py-3 text-white font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:bg-stone-500 disabled:shadow-none ${className}`}
    >
      {isPending ? <SpinnerLabel text="処理中..." /> : label}
    </button>
  )
}
