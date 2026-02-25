import { Check, User } from "lucide-react"

import type { EntryWithProfile } from "@/lib/types/entry"
import type { Role } from "@/lib/types/profile"
import { ROLE_LABELS } from "@/lib/types/profile"
import { formatDateTimeJST } from "@/lib/utils/datetime"

type EntryTableProps = {
  entries: EntryWithProfile[]
  showCheckin: boolean
}

function RoleCell({ role }: { role: Role | null }) {
  if (!role) return <span className="text-gray-400">-</span>
  return <span>{ROLE_LABELS[role]}</span>
}

function AvatarPlaceholder() {
  return (
    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
      <User className="w-5 h-5 text-gray-400" />
    </div>
  )
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

export function EntryTable({ entries, showCheckin }: EntryTableProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-gray-500">
        まだエントリーがありません
      </div>
    )
  }

  return (
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
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                第2希望
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                第3希望
              </th>
              {showCheckin && (
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  チェックイン
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                エントリー日時
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                {entry.profiles ? (
                  <>
                    <td className="px-4 py-3">
                      {entry.profiles.avatar_url &&
                      isAllowedAvatarUrl(entry.profiles.avatar_url) ? (
                        <img
                          src={entry.profiles.avatar_url}
                          alt=""
                          loading="lazy"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <AvatarPlaceholder />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {entry.profiles.player_name ?? (
                        <span className="text-gray-400">（未設定）</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <RoleCell role={entry.profiles.first_role} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <RoleCell role={entry.profiles.second_role} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <RoleCell role={entry.profiles.third_role} />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <AvatarPlaceholder />
                    </td>
                    <td className="px-4 py-3 text-gray-400" colSpan={4}>
                      （削除されたユーザー）
                    </td>
                  </>
                )}
                {showCheckin && (
                  <td className="px-4 py-3 text-center">
                    {entry.checked_in_at ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                        <Check className="w-3 h-3" />済
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        未
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDateTimeJST(entry.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
