import { describe, expect, it } from "vitest"
import { getLobbyButtonState } from "../get-lobby-button-state"

describe("getLobbyButtonState", () => {
  it("未エントリーの場合は not_entered を返す", () => {
    expect(getLobbyButtonState(false, false)).toBe("not_entered")
    expect(getLobbyButtonState(false, true)).toBe("not_entered")
  })

  it("エントリー済みで in_progress マッチがない場合は no_active_match を返す", () => {
    expect(getLobbyButtonState(true, false)).toBe("no_active_match")
  })

  it("エントリー済みで in_progress マッチがある場合は can_enter を返す", () => {
    expect(getLobbyButtonState(true, true)).toBe("can_enter")
  })
})
