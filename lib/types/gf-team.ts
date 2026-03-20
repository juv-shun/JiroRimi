/**
 * GFチーム編成関連の型定義
 */

import type { ParticipantInfo } from "./match"

/** GFチーム1枠分の構成 */
export type GfTeamSlot = {
  seed: number // 1-4
  name: string
  members: ParticipantInfo[]
}

/** GFチーム編成 API リクエスト */
export type GfTeamAssignmentRequest = {
  teams: {
    seed: number
    name: string
    member_profile_ids: string[]
  }[]
}
