import type { Profile } from "@/lib/types/profile"

/**
 * プロフィールが完了しているかを判定する
 */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false

  const { player_name, x_id, gender, first_role, second_role, third_role } =
    profile

  if (!player_name || player_name.trim() === "") return false
  if (!x_id || x_id === "PENDING" || x_id.trim() === "") return false
  if (!gender) return false
  if (!first_role || !second_role || !third_role) return false

  const roles = [first_role, second_role, third_role]
  if (new Set(roles).size !== 3) return false

  return true
}
