/**
 * 大会・予選関連の型定義
 */

export type { ActionResult } from "./profile"

// 大会性別
export type TournamentGender = "boys" | "girls"

// 大会性別ラベル
export const TOURNAMENT_GENDER_LABELS: Record<TournamentGender, string> = {
  boys: "じろカップ（Boys）",
  girls: "りみカップ（Girls）",
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
  gender: TournamentGender
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
