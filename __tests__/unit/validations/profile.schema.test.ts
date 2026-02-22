import { profileSchema } from "@/lib/validations/profile"

describe("profileSchema", () => {
  const VALID_PROFILE_INPUT = {
    player_name: "テストプレイヤー",
    x_id: "test_user123",
    gender: "boys" as const,
    first_role: "top_carry" as const,
    second_role: "mid" as const,
    third_role: "support" as const,
  }

  it("U20: 有効なプロフィール入力はparse成功する", () => {
    expect(() => profileSchema.parse(VALID_PROFILE_INPUT)).not.toThrow()
  })

  it("U21: player_nameが空文字ならplayer_name項目で失敗する", () => {
    const result = profileSchema.safeParse({
      ...VALID_PROFILE_INPUT,
      player_name: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === "player_name"),
      ).toBe(true)
    }
  })

  it("U22: x_idがpending(大文字小文字不問)ならx_id項目で失敗する", () => {
    const result = profileSchema.safeParse({
      ...VALID_PROFILE_INPUT,
      x_id: "PENDING",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === "x_id"),
      ).toBe(true)
    }
  })

  it("U23: first_roleとsecond_roleが同一ならクロスフィールド検証で失敗する", () => {
    const result = profileSchema.safeParse({
      ...VALID_PROFILE_INPUT,
      first_role: "top_carry",
      second_role: "top_carry",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === "second_role"),
      ).toBe(true)
    }
  })
})
