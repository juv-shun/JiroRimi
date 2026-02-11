"use client"

import { createClient } from "@/lib/supabase/client"

export function LoginButton() {
  const handleLogin = async () => {
    const supabase = createClient()

    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="bg-primary hover:bg-primary-hover text-white font-medium py-3 px-6 rounded-lg transition-colors"
    >
      Discordでログイン
    </button>
  )
}
