"use client"

import { signOut } from "@/app/actions/auth"

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-text-secondary hover:text-primary font-medium transition-colors"
      >
        ログアウト
      </button>
    </form>
  )
}
