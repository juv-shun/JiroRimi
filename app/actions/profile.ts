"use server"

import type { ActionResult } from "@/lib/types/profile"

/**
 * プロフィールを更新するServer Action（最小テスト版）
 */
export async function updateProfile(
  _prevState: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  return { success: true }
}
