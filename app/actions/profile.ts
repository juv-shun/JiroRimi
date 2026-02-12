"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { profileSchema } from "@/lib/validations/profile"
import type { ActionResult } from "@/lib/types/profile"

/**
 * プロフィールを更新するServer Action
 */
export async function updateProfile(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "認証が必要です" }
  }

  // FormDataから値を取得
  const rawData = {
    player_name: formData.get("player_name"),
    x_id: formData.get("x_id"),
    gender: formData.get("gender"),
    first_role: formData.get("first_role"),
    second_role: formData.get("second_role"),
    third_role: formData.get("third_role"),
  }

  // バリデーション
  const validated = profileSchema.safeParse(rawData)

  if (!validated.success) {
    // 最初のエラーメッセージを返す
    const firstError = validated.error.issues[0]
    return { success: false, error: firstError.message }
  }

  // DBを更新
  const { error } = await supabase
    .from("profiles")
    .update({
      player_name: validated.data.player_name,
      x_id: validated.data.x_id,
      gender: validated.data.gender,
      first_role: validated.data.first_role,
      second_role: validated.data.second_role,
      third_role: validated.data.third_role,
    })
    .eq("id", user.id)

  if (error) {
    console.error("Profile update failed:", error.message)
    return { success: false, error: "プロフィールの更新に失敗しました" }
  }

  // ページを再検証して最新データを反映
  revalidatePath("/mypage")

  return { success: true }
}
