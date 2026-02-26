/**
 * チーム編成・試合関連の型定義
 */

import type { Role } from "./profile"

// マッチステータス
export type MatchStatus = "waiting" | "in_progress" | "confirmed"

// マッチ結果
export type MatchResult = "team_a" | "team_b" | null

// 投票値
export type Vote = "win" | "lose"

// チーム識別子
export type Team = "team_a" | "team_b"

/** 試合画面表示用の参加者情報 */
export type MatchParticipantForDisplay = {
  profileId: string
  playerName: string | null
  avatarUrl: string | null
  firstRole: Role | null
  team: Team
  vote: Vote | null
}

/** 試合画面表示用のマッチ情報 */
export type MatchForDisplay = {
  matchId: string
  roundNumber: number
  lobbyNumber: string | null
  status: MatchStatus
  result: MatchResult
  myTeam: Team
  teamA: MatchParticipantForDisplay[]
  teamB: MatchParticipantForDisplay[]
  myVote: Vote | null
}

/** ラウンド情報 */
export type RoundInfo = {
  roundNumber: number
  status: MatchStatus
}

/** チーム編成時の参加者情報 */
export type ParticipantInfo = {
  profileId: string
  playerName: string | null
  avatarUrl: string | null
  firstRole: Role | null
  secondRole: Role | null
  thirdRole: Role | null
}

/** マッチ1試合分のチーム構成 */
export type MatchSlot = {
  teamA: ParticipantInfo[] // max 5
  teamB: ParticipantInfo[] // max 5
}

/** 確定済みラウンドのマッチ情報（読み取り専用表示用） */
export type ExistingMatchInfo = {
  matchId: string
  teamA: ParticipantInfo[]
  teamB: ParticipantInfo[]
}

/** 確定済みラウンドの情報 */
export type ExistingRound = {
  roundNumber: number
  matches: ExistingMatchInfo[]
}

/** チーム編成 API リクエスト（round_number はサーバー側で算出） */
export type TeamAssignmentRequest = {
  matches: {
    team_a_profile_ids: string[] // exactly 5 UUIDs
    team_b_profile_ids: string[] // exactly 5 UUIDs
  }[]
}
