"use client"

import { useActionState, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateProfile } from "@/app/actions/profile"
import { profileSchema, type ProfileFormData } from "@/lib/validations/profile"
import {
  type Profile,
  type Role,
  ROLES,
  ROLE_LABELS,
  GENDER_LABELS,
  type ActionResult,
} from "@/lib/types/profile"

type ProfileFormProps = {
  profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    updateProfile,
    null,
  )
  const [showSuccess, setShowSuccess] = useState(false)

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      player_name: profile.player_name ?? "",
      x_id: profile.x_id === "PENDING" ? "" : (profile.x_id ?? ""),
      gender: profile.gender ?? undefined,
      first_role: profile.first_role ?? undefined,
      second_role: profile.second_role ?? undefined,
      third_role: profile.third_role ?? undefined,
    },
    mode: "onChange",
  })

  // 選択中のロールを監視
  const firstRole = watch("first_role")
  const secondRole = watch("second_role")
  const thirdRole = watch("third_role")

  // 成功メッセージの表示制御
  useEffect(() => {
    if (state?.success) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [state])

  // 選択不可のロールを取得
  const getDisabledRoles = (excludeField: "first" | "second" | "third"): Role[] => {
    const selected: Role[] = []
    if (excludeField !== "first" && firstRole) selected.push(firstRole)
    if (excludeField !== "second" && secondRole) selected.push(secondRole)
    if (excludeField !== "third" && thirdRole) selected.push(thirdRole)
    return selected
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* プロフィール情報カード */}
      <section className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden transition-all duration-200 hover:shadow-md">
        {/* ヘッダー部分：グラデーション背景 */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <span className="w-1.5 h-5 bg-primary rounded-full" />
            プロフィール情報
          </h2>
        </div>

        <div className="p-6">
          {/* メインコンテンツ：3カラムグリッド */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-start">
            {/* 左：アバター */}
            <div className="relative group">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="プロフィール画像"
                  className="w-20 h-20 rounded-2xl border-2 border-primary/20 shadow-sm object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 border-2 border-border flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
              {/* アバターの装飾 */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* 中央：プレイヤー名・X ID */}
            <div className="space-y-3 min-w-0">
              {/* プレイヤー名 */}
              <div>
                <label
                  htmlFor="player_name"
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  プレイヤー名
                </label>
                <input
                  id="player_name"
                  type="text"
                  {...register("player_name")}
                  placeholder="ゲーム内で表示される名前"
                  className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                {errors.player_name && (
                  <p className="mt-1 text-xs text-error">{errors.player_name.message}</p>
                )}
              </div>

              {/* X ID */}
              <div>
                <label
                  htmlFor="x_id"
                  className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                >
                  X ID
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                    @
                  </span>
                  <input
                    id="x_id"
                    type="text"
                    {...register("x_id")}
                    placeholder="username"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>
                {errors.x_id && (
                  <p className="mt-1 text-xs text-error">{errors.x_id.message}</p>
                )}
              </div>
            </div>

            {/* 右：性別選択（縦並びトグル） */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wide text-center">
                性別
              </span>
              <div className="flex flex-col gap-1.5">
                {(["boys", "girls"] as const).map((gender) => (
                  <label
                    key={gender}
                    className="relative cursor-pointer"
                  >
                    <input
                      type="radio"
                      {...register("gender")}
                      value={gender}
                      className="peer sr-only"
                    />
                    <div
                      className={`w-16 py-2 rounded-xl border-2 text-center transition-all duration-200 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-md ${
                        gender === "boys"
                          ? "border-blue-200 hover:border-blue-300 bg-blue-50/50"
                          : "border-pink-200 hover:border-pink-300 bg-pink-50/50"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium transition-colors peer-checked:text-white ${
                          gender === "boys" ? "text-blue-600" : "text-pink-600"
                        }`}
                      >
                        {GENDER_LABELS[gender]}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              {errors.gender && (
                <p className="mt-1 text-xs text-error text-center">{errors.gender.message}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ロール設定カード */}
      <section className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden transition-all duration-200 hover:shadow-md">
        {/* ヘッダー部分：グラデーション背景 */}
        <div className="bg-gradient-to-r from-success/10 via-success/5 to-transparent px-6 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <span className="w-1.5 h-5 bg-success rounded-full" />
            ロール優先順位
          </h2>
        </div>

        <div className="p-6">
          {/* 3カラムグリッドでセレクトを横並び */}
          <div className="grid grid-cols-3 gap-4">
            {/* 第1希望 */}
            <div>
              <label
                htmlFor="first_role"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1 text-center"
              >
                第1希望
              </label>
              <select
                id="first_role"
                {...register("first_role")}
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.25em 1.25em",
                }}
              >
                <option value="">選択</option>
                {ROLES.map((role) => (
                  <option
                    key={role}
                    value={role}
                    disabled={getDisabledRoles("first").includes(role)}
                  >
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              {errors.first_role && (
                <p className="mt-1 text-xs text-error text-center">{errors.first_role.message}</p>
              )}
            </div>

            {/* 第2希望 */}
            <div>
              <label
                htmlFor="second_role"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1 text-center"
              >
                第2希望
              </label>
              <select
                id="second_role"
                {...register("second_role")}
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.25em 1.25em",
                }}
              >
                <option value="">選択</option>
                {ROLES.map((role) => (
                  <option
                    key={role}
                    value={role}
                    disabled={getDisabledRoles("second").includes(role)}
                  >
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              {errors.second_role && (
                <p className="mt-1 text-xs text-error text-center">{errors.second_role.message}</p>
              )}
            </div>

            {/* 第3希望 */}
            <div>
              <label
                htmlFor="third_role"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1 text-center"
              >
                第3希望
              </label>
              <select
                id="third_role"
                {...register("third_role")}
                className="w-full px-3 py-2 rounded-lg border border-border text-text-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.25em 1.25em",
                }}
              >
                <option value="">選択</option>
                {ROLES.map((role) => (
                  <option
                    key={role}
                    value={role}
                    disabled={getDisabledRoles("third").includes(role)}
                  >
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              {errors.third_role && (
                <p className="mt-1 text-xs text-error text-center">{errors.third_role.message}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* メッセージ表示 */}
      {state && !state.success && (
        <div className="p-4 bg-red-50 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{state.error}</p>
        </div>
      )}

      {showSuccess && (
        <div className="p-4 bg-green-50 border border-success/20 rounded-lg animate-fade-in">
          <p className="text-sm text-success">プロフィールを保存しました</p>
        </div>
      )}

      {/* 保存ボタン */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-4 bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:transform-none shadow-md hover:shadow-lg disabled:shadow-none"
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
          "保存する"
        )}
      </button>
    </form>
  )
}
