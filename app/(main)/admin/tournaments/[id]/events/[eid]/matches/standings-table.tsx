"use client"

import { User } from "lucide-react"

import type { AdminMatchForDisplay } from "@/lib/types/match"
import { computeStandings } from "@/lib/utils/match-result"

type StandingsTableProps = {
  matches: AdminMatchForDisplay[]
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

export function StandingsTable({ matches }: StandingsTableProps) {
  const standings = computeStandings(matches)

  if (standings.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 w-12">
              #
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500">
              プレイヤー
            </th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 w-16">
              勝
            </th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 w-16">
              敗
            </th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 w-20">
              勝率
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.profileId}
              className="border-b border-gray-50 last:border-b-0"
            >
              <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {s.avatarUrl && isAllowedAvatarUrl(s.avatarUrl) ? (
                    <img
                      src={s.avatarUrl}
                      alt=""
                      loading="lazy"
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                  <span className="font-medium text-gray-900 truncate">
                    {s.playerName ?? "（未設定）"}
                  </span>
                </div>
              </td>
              <td className="text-center px-4 py-3 font-semibold text-green-600">
                {s.wins}
              </td>
              <td className="text-center px-4 py-3 font-semibold text-red-600">
                {s.losses}
              </td>
              <td className="text-center px-4 py-3 font-medium text-gray-700">
                {(s.winRate * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
