/**
 * 試合関連のバリデーションスキーマ
 */

import { z } from "zod"

// ロビー番号のスキーマ
export const lobbyNumberSchema = z.object({
  lobby_number: z
    .string()
    .min(1, "ロビー番号を入力してください")
    .max(20, "ロビー番号は20文字以内で入力してください"),
})

// 勝敗投票のスキーマ
export const voteSchema = z.object({
  vote: z.enum(["win", "lose"], {
    error: "勝ちまたは負けを選択してください",
  }),
})

// バリデーション後の型
export type LobbyNumberFormData = z.infer<typeof lobbyNumberSchema>
export type VoteFormData = z.infer<typeof voteSchema>
