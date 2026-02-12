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
      {/* Discord情報カード */}
      <section className="bg-white rounded-xl shadow-sm border border-border p-6 transition-all duration-200 hover:shadow-md">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-[#5865F2] rounded-full" />
          Discord連携情報
        </h2>
        <div className="flex items-start gap-6">
          {/* アバター */}
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.discord_username ?? "Discord アバター"}
                className="w-20 h-20 rounded-full border-2 border-[#5865F2]/20 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#5865F2]/10 border-2 border-[#5865F2]/20 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-[#5865F2]/50"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
          {/* Discord情報 */}
          <div className="flex-1 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Discord ID
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-text-primary font-mono text-sm border border-border">
                {profile.discord_id}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                ユーザー名
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-text-primary text-sm border border-border">
                {profile.discord_username ?? "未設定"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* プロフィール情報カード */}
      <section className="bg-white rounded-xl shadow-sm border border-border p-6 transition-all duration-200 hover:shadow-md">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-primary rounded-full" />
          プロフィール情報
        </h2>
        <div className="space-y-5">
          {/* プレイヤー名 */}
          <div>
            <label
              htmlFor="player_name"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              プレイヤー名
              <span className="text-error ml-1">*</span>
            </label>
            <input
              id="player_name"
              type="text"
              {...register("player_name")}
              placeholder="ゲーム内で表示される名前"
              className="w-full px-4 py-3 rounded-lg border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
            {errors.player_name && (
              <p className="mt-1.5 text-sm text-error">{errors.player_name.message}</p>
            )}
          </div>

          {/* X ID */}
          <div>
            <label
              htmlFor="x_id"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              X ID
              <span className="text-error ml-1">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                @
              </span>
              <input
                id="x_id"
                type="text"
                {...register("x_id")}
                placeholder="username"
                className="w-full pl-9 pr-4 py-3 rounded-lg border border-border text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>
            {errors.x_id && (
              <p className="mt-1.5 text-sm text-error">{errors.x_id.message}</p>
            )}
          </div>

          {/* 性別 */}
          <div>
            <span className="block text-sm font-medium text-text-primary mb-2">
              参加カップ
              <span className="text-error ml-1">*</span>
            </span>
            <div className="flex gap-4">
              {(["boys", "girls"] as const).map((gender) => (
                <label
                  key={gender}
                  className="flex-1 relative cursor-pointer"
                >
                  <input
                    type="radio"
                    {...register("gender")}
                    value={gender}
                    className="peer sr-only"
                  />
                  <div
                    className={`p-4 rounded-lg border-2 text-center transition-all duration-200 peer-checked:border-primary peer-checked:bg-primary-light ${
                      gender === "boys"
                        ? "border-blue-200 hover:border-blue-300"
                        : "border-pink-200 hover:border-pink-300"
                    }`}
                  >
                    <span
                      className={`font-medium ${
                        gender === "boys" ? "text-blue-600" : "text-pink-600"
                      }`}
                    >
                      {GENDER_LABELS[gender]}
                    </span>
                    <span className="block text-xs text-text-secondary mt-1">
                      {gender === "boys" ? "じろカップ" : "りみカップ"}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            {errors.gender && (
              <p className="mt-1.5 text-sm text-error">{errors.gender.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* ロール設定カード */}
      <section className="bg-white rounded-xl shadow-sm border border-border p-6 transition-all duration-200 hover:shadow-md">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-success rounded-full" />
          ロール優先順位
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          希望するロールを優先順に3つ選択してください
        </p>
        <div className="space-y-4">
          {/* 第1希望 */}
          <div>
            <label
              htmlFor="first_role"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              第1希望
              <span className="text-error ml-1">*</span>
            </label>
            <select
              id="first_role"
              {...register("first_role")}
              className="w-full px-4 py-3 rounded-lg border border-border text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.75rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.5em 1.5em",
              }}
            >
              <option value="">選択してください</option>
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
              <p className="mt-1.5 text-sm text-error">{errors.first_role.message}</p>
            )}
          </div>

          {/* 第2希望 */}
          <div>
            <label
              htmlFor="second_role"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              第2希望
              <span className="text-error ml-1">*</span>
            </label>
            <select
              id="second_role"
              {...register("second_role")}
              className="w-full px-4 py-3 rounded-lg border border-border text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.75rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.5em 1.5em",
              }}
            >
              <option value="">選択してください</option>
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
              <p className="mt-1.5 text-sm text-error">{errors.second_role.message}</p>
            )}
          </div>

          {/* 第3希望 */}
          <div>
            <label
              htmlFor="third_role"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              第3希望
              <span className="text-error ml-1">*</span>
            </label>
            <select
              id="third_role"
              {...register("third_role")}
              className="w-full px-4 py-3 rounded-lg border border-border text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.75rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.5em 1.5em",
              }}
            >
              <option value="">選択してください</option>
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
              <p className="mt-1.5 text-sm text-error">{errors.third_role.message}</p>
            )}
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
