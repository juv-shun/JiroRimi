/**
 * プロフィールのバリデーションスキーマ
 */

import { z } from "zod"
import { ROLES } from "@/lib/types/profile"

// ロールのスキーマ
const roleSchema = z.enum(ROLES, {
  error: "ロールを選択してください",
})

// プロフィール更新のスキーマ
export const profileSchema = z
  .object({
    player_name: z
      .string()
      .min(1, "プレイヤー名は必須です")
      .max(50, "プレイヤー名は50文字以内で入力してください"),
    x_id: z
      .string()
      .min(1, "X IDは必須です")
      .max(15, "X IDは15文字以内で入力してください")
      .regex(
        /^[A-Za-z0-9_]+$/,
        "X IDは英数字とアンダースコアのみ使用できます",
      )
      .refine(
        (val) => val.toLowerCase() !== "pending",
        "有効なX IDを入力してください",
      ),
    gender: z.enum(["boys", "girls"], {
      error: "性別を選択してください",
    }),
    first_role: roleSchema,
    second_role: roleSchema,
    third_role: roleSchema,
  })
  .refine(
    (data) => data.first_role !== data.second_role,
    {
      message: "第2希望は第1希望と異なるロールを選択してください",
      path: ["second_role"],
    },
  )
  .refine(
    (data) => data.first_role !== data.third_role,
    {
      message: "第3希望は第1希望と異なるロールを選択してください",
      path: ["third_role"],
    },
  )
  .refine(
    (data) => data.second_role !== data.third_role,
    {
      message: "第3希望は第2希望と異なるロールを選択してください",
      path: ["third_role"],
    },
  )

// バリデーション後の型
export type ProfileFormData = z.infer<typeof profileSchema>
