/**
 * 大会作成のバリデーションスキーマ
 */

import { z } from "zod"

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const datetimeLocalPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

// イベント1件のスキーマ
export const eventSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z
      .string()
      .min(1, "イベント名は必須です")
      .max(100, "イベント名は100文字以内で入力してください"),
    entry_type: z.enum(["open", "invite"]),
    match_format: z.enum([
      "swiss",
      "double_elimination",
      "single_elimination",
      "round_robin",
    ]),
    matches_per_event: z
      .number()
      .int("整数で入力してください")
      .min(1, "1以上の値を入力してください")
      .max(10, "10以下の値を入力してください"),
    max_participants: z
      .union([z.nan(), z.null(), z.number().int().min(1)])
      .optional(),
    scheduled_date: z
      .string()
      .min(1, "開催日は必須です")
      .regex(datePattern, "日付の形式が不正です"),
    entry_start: z
      .string()
      .min(1, "エントリー開始日時は必須です")
      .regex(datetimeLocalPattern, "日時の形式が不正です"),
    entry_end: z
      .string()
      .min(1, "エントリー締切日時は必須です")
      .regex(datetimeLocalPattern, "日時の形式が不正です"),
    checkin_start: z
      .string()
      .min(1, "チェックイン開始日時は必須です")
      .regex(datetimeLocalPattern, "日時の形式が不正です"),
    checkin_end: z
      .string()
      .min(1, "チェックイン締切日時は必須です")
      .regex(datetimeLocalPattern, "日時の形式が不正です"),
    rules: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.entry_start || !data.entry_end || data.entry_start < data.entry_end,
    {
      message: "エントリー締切はエントリー開始より後にしてください",
      path: ["entry_end"],
    },
  )
  .refine(
    (data) =>
      !data.entry_end ||
      !data.checkin_start ||
      data.entry_end <= data.checkin_start,
    {
      message: "チェックイン開始はエントリー締切以降にしてください",
      path: ["checkin_start"],
    },
  )
  .refine(
    (data) =>
      !data.checkin_start ||
      !data.checkin_end ||
      data.checkin_start < data.checkin_end,
    {
      message: "チェックイン締切はチェックイン開始より後にしてください",
      path: ["checkin_end"],
    },
  )

// 大会作成のスキーマ
export const tournamentCreateSchema = z.object({
  name: z
    .string()
    .min(1, "大会名は必須です")
    .max(100, "大会名は100文字以内で入力してください"),
  events: z.array(eventSchema).min(1, "イベントは最低1つ必要です"),
})

// 大会更新のスキーマ
export const tournamentUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "大会名は必須です")
    .max(100, "大会名は100文字以内で入力してください"),
  status: z.enum(["draft", "open", "in_progress", "completed"]),
  events: z.array(eventSchema).min(1, "イベントは最低1つ必要です"),
})

// バリデーション後の型
export type TournamentCreateFormData = z.infer<typeof tournamentCreateSchema>
export type TournamentUpdateFormData = z.infer<typeof tournamentUpdateSchema>
