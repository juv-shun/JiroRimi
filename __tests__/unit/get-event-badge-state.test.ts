import {
  getEventBadgeState,
  EVENT_BADGE_LABELS,
} from "@/app/(main)/tournaments/get-event-badge-state"

describe("getEventBadgeState", () => {
  it("未エントリー → none", () => {
    expect(getEventBadgeState({}, undefined)).toBe("none")
  })

  it("エントリー済み・未チェックイン・scheduled → entered", () => {
    expect(
      getEventBadgeState(
        { status: "scheduled" },
        { checked_in_at: null },
      ),
    ).toBe("entered")
  })

  it("エントリー済み・未チェックイン・in_progress → entered（チェックインしていないため）", () => {
    expect(
      getEventBadgeState(
        { status: "in_progress" },
        { checked_in_at: null },
      ),
    ).toBe("entered")
  })

  it("エントリー済み・未チェックイン・completed → entered（チェックインしていないため）", () => {
    expect(
      getEventBadgeState(
        { status: "completed" },
        { checked_in_at: null },
      ),
    ).toBe("entered")
  })

  it("チェックイン済み・status未設定 → checked_in", () => {
    expect(
      getEventBadgeState(
        {},
        { checked_in_at: "2024-02-22T10:00:00Z" },
      ),
    ).toBe("checked_in")
  })

  it("チェックイン済み・scheduled → checked_in", () => {
    expect(
      getEventBadgeState(
        { status: "scheduled" },
        { checked_in_at: "2024-02-22T10:00:00Z" },
      ),
    ).toBe("checked_in")
  })

  it("チェックイン済み・in_progress → in_progress", () => {
    expect(
      getEventBadgeState(
        { status: "in_progress" },
        { checked_in_at: "2024-02-22T10:00:00Z" },
      ),
    ).toBe("in_progress")
  })

  it("チェックイン済み・completed → completed", () => {
    expect(
      getEventBadgeState(
        { status: "completed" },
        { checked_in_at: "2024-02-22T10:00:00Z" },
      ),
    ).toBe("completed")
  })

})

describe("EVENT_BADGE_LABELS", () => {
  it("全てのバッジ状態（none以外）にラベルが定義されている", () => {
    expect(EVENT_BADGE_LABELS.entered).toBe("エントリー済")
    expect(EVENT_BADGE_LABELS.checked_in).toBe("チェックイン済")
    expect(EVENT_BADGE_LABELS.in_progress).toBe("イベント参加中")
    expect(EVENT_BADGE_LABELS.completed).toBe("イベント参加済")
  })
})
