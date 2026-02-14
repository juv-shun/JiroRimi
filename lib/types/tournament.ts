/**
 * 大会・予選関連の型定義
 */

export type { ActionResult } from "./profile"

// 大会カテゴリ
export type TournamentCategory = "boys" | "girls" | "both"

// 大会カテゴリラベル
export const TOURNAMENT_CATEGORY_LABELS: Record<TournamentCategory, string> = {
  boys: "じろカップ（Boys）",
  girls: "りみカップ（Girls）",
  both: "Jiro-Rimi Cup（Boys & Girls）",
}

/** is_boys/is_girls フラグからカテゴリを導出する */
export function getTournamentCategory(
  is_boys: boolean,
  is_girls: boolean,
): TournamentCategory {
  if (is_boys && is_girls) return "both"
  if (is_boys) return "boys"
  return "girls"
}

// 大会ステータス
export type TournamentStatus = "draft" | "open" | "in_progress" | "completed"

// 大会ステータスラベル
export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "下書き",
  open: "公開中",
  in_progress: "開催中",
  completed: "完了",
}

// 予選ステータス
export type QualifierStatus =
  | "scheduled"
  | "entry_open"
  | "entry_closed"
  | "checkin_open"
  | "participants_confirmed"
  | "in_progress"
  | "completed"

// 大会型
export type Tournament = {
  id: string
  name: string
  is_boys: boolean
  is_girls: boolean
  matches_per_qualifier: number
  gf_advance_count: number
  max_participants: number | null
  rules: string | null
  status: TournamentStatus
  created_at: string
  updated_at: string
}

// 予選型
export type Qualifier = {
  id: string
  tournament_id: string
  qualifier_number: number
  scheduled_date: string
  entry_start: string
  entry_end: string
  checkin_start: string
  checkin_end: string
  rules: string | null
  status: QualifierStatus
  created_at: string
  updated_at: string
}
