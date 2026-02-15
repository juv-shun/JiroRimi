/**
 * 大会・イベント関連の型定義
 */

export type { ActionResult } from "./profile"

// 大会ステータス
export type TournamentStatus = "draft" | "open" | "in_progress" | "completed"

// 大会ステータスラベル
export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "下書き",
  open: "公開中",
  in_progress: "進行中",
  completed: "終了",
}

// イベントステータス
export type EventStatus =
  | "scheduled"
  | "entry_open"
  | "entry_closed"
  | "checkin_open"
  | "participants_confirmed"
  | "in_progress"
  | "completed"

// エントリー方式
export type EntryType = "open" | "invite"

// 進行形式
export type MatchFormat = "qualifier" | "double_elimination"

// エントリー方式ラベル
export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  open: "オープン",
  invite: "招待制",
}

// 進行形式ラベル
export const MATCH_FORMAT_LABELS: Record<MatchFormat, string> = {
  qualifier: "予選",
  double_elimination: "ダブルエリミネーション",
}

// 大会型（イベント数付き、一覧表示用）
export type TournamentWithEventCount = {
  id: string
  name: string
  status: TournamentStatus
  created_at: string
  events: { count: number }[]
}

// 大会型
export type Tournament = {
  id: string
  name: string
  status: TournamentStatus
  created_at: string
  updated_at: string
}

// イベント型（DOM の Event との衝突回避のため TournamentEvent）
export type TournamentEvent = {
  id: string
  tournament_id: string
  event_number: number
  name: string
  entry_type: EntryType
  match_format: MatchFormat
  matches_per_event: number | null
  max_participants: number | null
  scheduled_date: string
  entry_start: string
  entry_end: string
  checkin_start: string
  checkin_end: string
  rules: string | null
  status: EventStatus
  created_at: string
  updated_at: string
}
