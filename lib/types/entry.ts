/**
 * エントリー一覧画面用の型定義
 */

import type { Role } from "./profile"

// Supabase の entries + profiles JOIN 結果の型
// profiles は profile_id → profiles.id の FK で単一オブジェクト（配列ではない）
// profiles が null になるケース: profile が削除された場合（通常は発生しない）
export type EntryWithProfile = {
  id: string
  created_at: string
  checked_in_at: string | null
  profiles: {
    player_name: string | null
    x_id?: string | null
    avatar_url: string | null
    first_role: Role | null
    second_role: Role | null
    third_role: Role | null
  } | null
}

export type RoleDistribution = {
  role: Role
  count: number
  percentage: number
}
