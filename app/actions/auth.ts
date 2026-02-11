"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    // エラーをログ出力（運用監視用）
    console.error("signOut failed:", error.message)
  }

  // 成功・失敗に関わらずリダイレクト
  // セッションが残っていても再ログインで上書きされるため
  redirect("/")
}
