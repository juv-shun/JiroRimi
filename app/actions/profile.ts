"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types/profile"

const VALID_GENDERS = ["boys", "girls"]
const VALID_ROLES = ["top_carry", "bot_carry", "mid", "tank", "support"]

/**
 * プロフィールを更新するServer Action
 */
export async function updateProfile(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "認証が必要です" }
    }

    // FormDataから値を取得
    const player_name = formData.get("player_name") as string | null
    const x_id = formData.get("x_id") as string | null
    const gender = formData.get("gender") as string | null
    const first_role = formData.get("first_role") as string | null
    const second_role = formData.get("second_role") as string | null
    const third_role = formData.get("third_role") as string | null

    // 簡易バリデーション（Zodなし）
    if (!player_name || player_name.trim() === "") {
      return { success: false, error: "プレイヤー名は必須です" }
    }
    if (!x_id || x_id.trim() === "") {
      return { success: false, error: "X IDは必須です" }
    }
    if (!gender || !VALID_GENDERS.includes(gender)) {
      return { success: false, error: "性別を選択してください" }
    }
    if (!first_role || !VALID_ROLES.includes(first_role)) {
      return { success: false, error: "第1希望ロールを選択してください" }
    }
    if (!second_role || !VALID_ROLES.includes(second_role)) {
      return { success: false, error: "第2希望ロールを選択してください" }
    }
    if (!third_role || !VALID_ROLES.includes(third_role)) {
      return { success: false, error: "第3希望ロールを選択してください" }
    }
    if (
      first_role === second_role ||
      first_role === third_role ||
      second_role === third_role
    ) {
      return { success: false, error: "ロールはすべて異なるものを選択してください" }
    }

    // DBを更新
    const { error } = await supabase
      .from("profiles")
      .update({
        player_name: player_name.trim(),
        x_id: x_id.trim(),
        gender,
        first_role,
        second_role,
        third_role,
      })
      .eq("id", user.id)

    if (error) {
      console.error("Profile update failed:", error.message)
      return { success: false, error: `プロフィールの更新に失敗しました: ${error.message}` }
    }

    // ページを再検証して最新データを反映
    revalidatePath("/mypage")

    return { success: true }
  } catch (e) {
    console.error("Server Action error:", e)
    return {
      success: false,
      error: `サーバーエラー: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}
