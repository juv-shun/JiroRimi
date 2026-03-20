"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import {
  Check,
  X,
  User,
  Loader2,
  CircleDot,
  CheckCircle2,
  Search,
  Plus,
  Trash2,
} from "lucide-react"

import { Toast } from "@/app/components/toast"
import type { EntryWithProfile } from "@/lib/types/entry"
import { ROLE_LABELS } from "@/lib/types/profile"
import type { Role } from "@/lib/types/profile"
import type { EntryType, EventStatus } from "@/lib/types/tournament"

type ProfileCandidate = {
  id: string
  player_name: string | null
  avatar_url: string | null
  first_role: string | null
}

type CheckinTableProps = {
  entries: EntryWithProfile[]
  eventId: string
  eventStatus: EventStatus
  entryType: EntryType
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

export function CheckinTable({
  entries,
  eventId,
  eventStatus,
  entryType,
}: CheckinTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [candidates, setCandidates] = useState<ProfileCandidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)
  const [confirmEntryId, setConfirmEntryId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: "success" | "error"
    isExiting: boolean
  }>({ show: false, message: "", type: "success", isExiting: false })

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const searchProfiles = useCallback(
    async (query: string) => {
      if (query.length < 1) {
        setCandidates([])
        setShowDropdown(false)
        return
      }
      setIsSearching(true)
      try {
        const params = new URLSearchParams({ q: query, event_id: eventId })
        const res = await fetch(`/api/admin/profiles?${params}`)
        const result = await res.json()
        if (result.success) {
          setCandidates(result.data)
          setShowDropdown(true)
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false)
      }
    },
    [eventId],
  )

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchProfiles(value), 300)
  }

  const handleAddEntry = (profileId: string) => {
    setShowDropdown(false)
    setSearchQuery("")
    setCandidates([])
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eventId, profile_id: profileId }),
        })
        const result = await res.json()
        if (result.success) {
          showToast("エントリーを追加しました", "success")
          router.refresh()
        } else {
          showToast(result.error ?? "エントリー追加に失敗しました", "error")
        }
      } catch {
        showToast("通信エラーが発生しました", "error")
      }
    })
  }

  const handleDeleteEntry = (entryId: string) => {
    setDeletingEntryId(entryId)
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/entries", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entry_id: entryId }),
        })
        const result = await res.json()
        if (result.success) {
          showToast("エントリーを削除しました", "success")
          router.refresh()
        } else {
          showToast(result.error ?? "エントリー削除に失敗しました", "error")
        }
      } catch {
        showToast("通信エラーが発生しました", "error")
      } finally {
        setDeletingEntryId(null)
      }
    })
  }

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

  const isScheduled = eventStatus === "scheduled"
  const isInvite = entryType === "invite"
  const showInviteControls = isInvite && isScheduled

  const inviteSearchUI = showInviteControls && (
    <div className="mb-4" ref={dropdownRef}>
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="プレイヤー名で検索してエントリー追加..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
        </div>

        {showDropdown && candidates.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-border shadow-lg max-h-60 overflow-y-auto">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => handleAddEntry(candidate.id)}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
              >
                {candidate.avatar_url &&
                isAllowedAvatarUrl(candidate.avatar_url) ? (
                  <img
                    src={candidate.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {candidate.player_name ?? "（未設定）"}
                  </p>
                  {candidate.first_role && (
                    <p className="text-xs text-gray-500">
                      {ROLE_LABELS[candidate.first_role as Role]}
                    </p>
                  )}
                </div>
                <Plus className="w-4 h-4 text-primary" />
              </button>
            ))}
          </div>
        )}

        {showDropdown && searchQuery.length >= 1 && candidates.length === 0 && !isSearching && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-border shadow-lg px-4 py-3 text-sm text-gray-500">
            該当するプレイヤーが見つかりません
          </div>
        )}
      </div>
    </div>
  )

  if (entries.length === 0 && !showInviteControls) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-gray-500">
        まだエントリーがありません
      </div>
    )
  }

  return (
    <>
      {/* イベントステータスセクション */}
      <div className="mb-4 flex items-center gap-3">
        {eventStatus === "in_progress" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <CircleDot className="w-3.5 h-3.5" />
            イベント進行中
          </span>
        )}
        {eventStatus === "completed" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            終了
          </span>
        )}
      </div>

      {inviteSearchUI}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            まだエントリーがありません
          </div>
        ) : (
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
                {isScheduled && (
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    操作
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isCheckedIn = entry.checked_in_at !== null
                const isLoading = isPending && pendingEntryId === entry.id
                const isDeleting = isPending && deletingEntryId === entry.id

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
                    {isScheduled && (
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
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
                              onClick={() => setConfirmEntryId(entry.id)}
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
                          {showInviteControls && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={isDeleting || isCheckedIn}
                              title={isCheckedIn ? "チェックイン済みのため削除不可" : "エントリー削除"}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {confirmEntryId && (() => {
        const targetEntry = entries.find((e) => e.id === confirmEntryId)
        const playerName = targetEntry?.profiles?.player_name ?? "（不明）"
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
              <p className="text-sm text-gray-700 mb-6">
                <span className="font-bold">{playerName}</span> さんを代わりにチェックイン済みにしますか？
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmEntryId(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const entryId = confirmEntryId
                    setConfirmEntryId(null)
                    handleCheckin(entryId)
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-success hover:bg-success/90 transition-colors"
                >
                  チェックインする
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        isExiting={toast.isExiting}
      />
    </>
  )
}
