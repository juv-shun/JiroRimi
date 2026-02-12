/**
 * プロフィール関連の型定義
 */

// 性別
export type Gender = "boys" | "girls"

// ロール
export type Role =
  | "top_carry"
  | "bot_carry"
  | "mid"
  | "tank"
  | "support"

// ロール一覧
export const ROLES = [
  "top_carry",
  "bot_carry",
  "mid",
  "tank",
  "support",
] as const satisfies readonly Role[]

// ロール表示名
export const ROLE_LABELS: Record<Role, string> = {
  top_carry: "上キャリー",
  bot_carry: "下キャリー",
  mid: "中央",
  tank: "タンク",
  support: "サポート",
}

// 性別表示名
export const GENDER_LABELS: Record<Gender, string> = {
  boys: "Boy",
  girls: "Girl",
}

// プロフィール型
export type Profile = {
  id: string
  discord_id: string
  discord_username: string | null
  avatar_url: string | null
  player_name: string | null
  x_id: string | null
  gender: Gender | null
  first_role: Role | null
  second_role: Role | null
  third_role: Role | null
  role: "user" | "admin"
  created_at: string
  updated_at: string
}

// Server Action の戻り値型
export type ActionResult =
  | { success: true }
  | { success: false; error: string }
