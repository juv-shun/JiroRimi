import type { Profile } from "@/lib/types/profile"
import { isProfileComplete } from "@/lib/utils/profile"

describe("isProfileComplete", () => {
  const validProfile: Profile = {
    id: "profile-1",
    discord_id: "discord-1",
    discord_username: "user1",
    avatar_url: null,
    player_name: "PlayerOne",
    x_id: "@playerone",
    gender: "boys",
    first_role: "top_carry",
    second_role: "mid",
    third_role: "support",
    role: "user",
    created_at: "2024-02-22T00:00:00Z",
    updated_at: "2024-02-22T00:00:00Z",
  }

  it("U16: profileがnullならfalse", () => {
    expect(isProfileComplete(null)).toBe(false)
  })

  it("U17: x_idがPENDINGならfalse", () => {
    const result = isProfileComplete({ ...validProfile, x_id: "PENDING" })

    expect(result).toBe(false)
  })

  it("U18: ロールが重複しているならfalse", () => {
    const result = isProfileComplete({
      ...validProfile,
      first_role: "tank",
      second_role: "tank",
    })

    expect(result).toBe(false)
  })

  it("U19: 必須項目が揃いロールがすべて異なればtrue", () => {
    expect(isProfileComplete(validProfile)).toBe(true)
  })
})
