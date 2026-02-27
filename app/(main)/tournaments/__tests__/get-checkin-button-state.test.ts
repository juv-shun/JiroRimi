import { describe, expect, it } from "vitest"
import { getCheckinButtonState } from "../get-checkin-button-state"

const baseEvent = {
  checkin_start: "2026-03-01T10:00:00Z",
  checkin_end: "2026-03-01T11:00:00Z",
}

describe("getCheckinButtonState", () => {
  it("未エントリーの場合は他の条件に関わらず not_entered を返す", () => {
    // チェックイン期間中でも未エントリーなら not_entered
    const during = new Date("2026-03-01T10:30:00Z")
    expect(getCheckinButtonState(baseEvent, null, during, false)).toBe("not_entered")

    // チェックイン済みでも未エントリーなら not_entered（エッジケース）
    expect(getCheckinButtonState(baseEvent, "2026-03-01T10:15:00Z", during, false)).toBe("not_entered")
  })

  it("チェックイン済みの場合は checked_in を返す", () => {
    const now = new Date("2026-03-01T10:30:00Z")
    expect(getCheckinButtonState(baseEvent, "2026-03-01T10:15:00Z", now, true)).toBe("checked_in")
  })

  it("イベント開始後（in_progress）で未チェックインの場合は event_started を返す", () => {
    const event = { ...baseEvent, status: "in_progress" as const }
    const now = new Date("2026-03-01T12:00:00Z")
    expect(getCheckinButtonState(event, null, now, true)).toBe("event_started")
  })

  it("チェックイン開始前の場合は before_checkin を返す", () => {
    const before = new Date("2026-03-01T09:00:00Z")
    expect(getCheckinButtonState(baseEvent, null, before, true)).toBe("before_checkin")
  })

  it("チェックイン期間中で未チェックインの場合は can_checkin を返す", () => {
    const during = new Date("2026-03-01T10:30:00Z")
    expect(getCheckinButtonState(baseEvent, null, during, true)).toBe("can_checkin")
  })

  it("チェックイン締切後の場合は checkin_closed を返す", () => {
    const after = new Date("2026-03-01T12:00:00Z")
    expect(getCheckinButtonState(baseEvent, null, after, true)).toBe("checkin_closed")
  })

  it("checked_in は event_started より優先される", () => {
    const event = { ...baseEvent, status: "in_progress" as const }
    const now = new Date("2026-03-01T12:00:00Z")
    expect(getCheckinButtonState(event, "2026-03-01T10:15:00Z", now, true)).toBe("checked_in")
  })

  it("checkin_start ちょうどは can_checkin を返す（境界値）", () => {
    const exactStart = new Date("2026-03-01T10:00:00Z")
    expect(getCheckinButtonState(baseEvent, null, exactStart, true)).toBe("can_checkin")
  })

  it("checkin_end ちょうどは can_checkin を返す（境界値）", () => {
    const exactEnd = new Date("2026-03-01T11:00:00Z")
    expect(getCheckinButtonState(baseEvent, null, exactEnd, true)).toBe("can_checkin")
  })
})
