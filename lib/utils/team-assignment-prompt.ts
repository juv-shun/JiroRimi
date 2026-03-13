import { Type } from "@google/genai"
import type { Role } from "@/lib/types/profile"
import { ROLE_LABELS } from "@/lib/types/profile"

type ParticipantInput = {
  profileId: string
  firstRole: Role | null
  secondRole: Role | null
  thirdRole: Role | null
}

type BuildPromptParams = {
  participants: ParticipantInput[]
  matchCount: number
  standingsMap: Record<string, { wins: number; losses: number }>
}

function formatRole(role: Role | null): string {
  return role ? ROLE_LABELS[role] : "なし"
}

function formatWinRate(wins: number, losses: number): string {
  const total = wins + losses
  if (total === 0) return "0%"
  return `${Math.round((wins / total) * 100)}%`
}

export function buildTeamAssignmentPrompt(params: BuildPromptParams): string {
  const { participants, matchCount, standingsMap } = params
  const hasStandings = Object.keys(standingsMap).length > 0

  const lines: string[] = []

  lines.push("あなたはポケモンユナイトの大会チーム編成AIです。")
  lines.push(
    `以下の${participants.length}名の参加者を${matchCount}試合に振り分けてください。`,
  )
  lines.push("各試合は TeamA 5人 / TeamB 5人 の構成です。")
  lines.push("")

  if (hasStandings) {
    lines.push("## 優先順位")
    lines.push("1. 全チームの平均勝率をできるだけ均一にすること（最重要）")
    lines.push("2. 各チーム内でロール希望が偏らないようにすること")
  } else {
    lines.push("## 優先順位")
    lines.push(
      "1. 各チーム内でロール希望が偏らないようにすること（ロール分散）",
    )
    lines.push("2. 同じロール第1希望の選手が1チームに集中しないようにすること")
  }

  lines.push("")
  lines.push("## 参加者一覧")
  lines.push("")

  for (const p of participants) {
    const parts = [`ID: ${p.profileId}`]
    parts.push(`第1希望: ${formatRole(p.firstRole)}`)
    parts.push(`第2希望: ${formatRole(p.secondRole)}`)
    parts.push(`第3希望: ${formatRole(p.thirdRole)}`)

    if (hasStandings) {
      const standing = standingsMap[p.profileId]
      if (standing) {
        parts.push(
          `成績: ${standing.wins}勝${standing.losses}敗 (勝率${formatWinRate(standing.wins, standing.losses)})`,
        )
      } else {
        parts.push("成績: なし")
      }
    }

    lines.push(`- ${parts.join(" / ")}`)
  }

  lines.push("")
  lines.push(`## 出力`)
  lines.push(`${matchCount}試合分の編成を出力してください。`)
  lines.push(
    "各試合の teamA と teamB にそれぞれ5人の参加者IDを配置してください。",
  )
  lines.push("全参加者を漏れなく・重複なく配置してください。")

  return lines.join("\n")
}

export const AI_TEAM_ASSIGNMENT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          teamA: { type: Type.ARRAY, items: { type: Type.STRING } },
          teamB: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["teamA", "teamB"],
      },
    },
  },
  required: ["matches"],
}
