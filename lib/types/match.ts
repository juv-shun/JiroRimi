/**
 * チーム編成・試合関連の型定義
 */

import type { Role } from "./profile"

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
