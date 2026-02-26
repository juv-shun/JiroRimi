import { describe, expect, it } from "vitest"
import { lobbyNumberSchema, voteSchema } from "../match"

describe("lobbyNumberSchema", () => {
  it("有効なロビー番号を受け入れる", () => {
    const result = lobbyNumberSchema.safeParse({ lobby_number: "12345" })
    expect(result.success).toBe(true)
  })

  it("1文字のロビー番号を受け入れる", () => {
    const result = lobbyNumberSchema.safeParse({ lobby_number: "A" })
    expect(result.success).toBe(true)
  })

  it("20文字のロビー番号を受け入れる", () => {
    const result = lobbyNumberSchema.safeParse({
      lobby_number: "A".repeat(20),
    })
    expect(result.success).toBe(true)
  })

  it("空文字を拒否する", () => {
    const result = lobbyNumberSchema.safeParse({ lobby_number: "" })
    expect(result.success).toBe(false)
  })

  it("21文字以上を拒否する", () => {
    const result = lobbyNumberSchema.safeParse({
      lobby_number: "A".repeat(21),
    })
    expect(result.success).toBe(false)
  })
})

describe("voteSchema", () => {
  it('"win" を受け入れる', () => {
    const result = voteSchema.safeParse({ vote: "win" })
    expect(result.success).toBe(true)
  })

  it('"lose" を受け入れる', () => {
    const result = voteSchema.safeParse({ vote: "lose" })
    expect(result.success).toBe(true)
  })

  it("無効な値を拒否する", () => {
    const result = voteSchema.safeParse({ vote: "draw" })
    expect(result.success).toBe(false)
  })
})
