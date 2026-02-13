"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types/profile"

/**
 * プロフィールを更新するServer Action（Supabaseテスト版）
 */
export async function updateProfile(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "認証が必要です" }
    }

    const player_name = formData.get("player_name") as string | null
    const x_id = formData.get("x_id") as string | null
    const gender = formData.get("gender") as string | null
    const first_role = formData.get("first_role") as string | null
    const second_role = formData.get("second_role") as string | null
    const third_role = formData.get("third_role") as string | null

    if (!player_name || !x_id || !gender || !first_role || !second_role || !third_role) {
      return { success: false, error: "すべてのフィールドを入力してください" }
    }

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
      return { success: false, error: `DB更新エラー: ${error.message}` }
    }

    revalidatePath("/mypage")
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: `サーバーエラー: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}
