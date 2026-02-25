"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Check, X, User, Loader2 } from "lucide-react"

import { Toast } from "@/app/components/toast"
import type { EntryWithProfile } from "@/lib/types/entry"
import { ROLE_LABELS } from "@/lib/types/profile"
import type { Role } from "@/lib/types/profile"

type CheckinTableProps = {
  entries: EntryWithProfile[]
}

function isAllowedAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false
    }
    const { hostname } = parsed
    return (
      hostname === "cdn.discordapp.com" ||
      hostname.endsWith(".discordapp.com") ||
      hostname.endsWith(".discord.com")
    )
  } catch {
    return false
  }
}

export function CheckinTable({ entries }: CheckinTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null)
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

  const handleCheckin = (entryId: string) => {
    setPendingEntryId(entryId)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/entries/${entryId}/checkin`, {
          method: "PATCH",
        })
        const result = await response.json()

        if (result.success) {
          showToast("チェックインしました", "success")
          router.refresh()
        } else {
          showToast(result.error ?? "チェックインに失敗しました", "error")
        }
      } catch {
        showToast("通信エラーが発生しました", "error")
      } finally {
        setPendingEntryId(null)
      }
    })
  }

  const handleCancel = (entryId: string) => {
    setPendingEntryId(entryId)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/entries/${entryId}/checkin`, {
          method: "DELETE",
        })
        const result = await response.json()

        if (result.success) {
          showToast("チェックインを取り消しました", "success")
          router.refresh()
        } else {
          showToast(result.error ?? "取り消しに失敗しました", "error")
        }
      } catch {
        showToast("通信エラーが発生しました", "error")
      } finally {
        setPendingEntryId(null)
      }
    })
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-gray-500">
        まだエントリーがありません
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-14" />
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  プレイヤー名
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  第1希望
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  チェックイン
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isCheckedIn = entry.checked_in_at !== null
                const isLoading = isPending && pendingEntryId === entry.id

                return (
                  <tr
                    key={entry.id}
                    className="border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    {/* アバター */}
                    <td className="px-4 py-3">
                      {entry.profiles?.avatar_url &&
                      isAllowedAvatarUrl(entry.profiles.avatar_url) ? (
                        <img
                          src={entry.profiles.avatar_url}
                          alt=""
                          loading="lazy"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </td>

                    {/* プレイヤー名 */}
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {entry.profiles?.player_name ?? (
                        <span className="text-gray-400">（未設定）</span>
                      )}
                    </td>

                    {/* 第1希望ロール */}
                    <td className="px-4 py-3 text-gray-700">
                      {entry.profiles?.first_role ? (
                        ROLE_LABELS[entry.profiles.first_role as Role]
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* チェックイン状況 */}
                    <td className="px-4 py-3 text-center">
                      {isCheckedIn ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                          <Check className="w-3 h-3" />
                          済
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          未
                        </span>
                      )}
                    </td>

                    {/* 操作ボタン */}
                    <td className="px-4 py-3 text-center">
                      {isCheckedIn ? (
                        <button
                          type="button"
                          onClick={() => handleCancel(entry.id)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-error bg-error/10 hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          取り消し
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCheckin(entry.id)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-success bg-success/10 hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          チェックイン
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        isExiting={toast.isExiting}
      />
    </>
  )
}
