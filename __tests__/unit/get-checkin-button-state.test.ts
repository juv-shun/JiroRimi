import { getCheckinButtonState } from "@/app/(main)/tournaments/get-checkin-button-state"

describe("getCheckinButtonState", () => {
  const baseEvent = {
    checkin_start: "2024-02-22T10:00:00Z",
    checkin_end: "2024-02-22T10:30:00Z",
  }

  it("U09: checkedInAtがあれば時間帯に関係なくchecked_inを返す", () => {
    const result = getCheckinButtonState(
      baseEvent,
      "2024-02-22T09:00:00Z",
      new Date("2024-02-22T09:30:00Z"),
      true,
    )

    expect(result).toBe("checked_in")
  })

  it("U10: 未チェックインかつ開始前ならbefore_checkinを返す", () => {
    const result = getCheckinButtonState(
      baseEvent,
      null,
      new Date("2024-02-22T09:59:59Z"),
      true,
    )

    expect(result).toBe("before_checkin")
  })

  it("U11: 未チェックインかつ終了後ならcheckin_closedを返す", () => {
    const result = getCheckinButtonState(
      baseEvent,
      null,
      new Date("2024-02-22T10:30:01Z"),
      true,
    )

    expect(result).toBe("checkin_closed")
  })

  it("U12: 未チェックインかつ期間内ならcan_checkinを返す", () => {
    const result = getCheckinButtonState(
      baseEvent,
      null,
      new Date("2024-02-22T10:15:00Z"),
      true,
    )

    expect(result).toBe("can_checkin")
  })
})
