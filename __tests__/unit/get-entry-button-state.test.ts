import { getEntryButtonState } from "@/app/(main)/tournaments/get-entry-button-state"

describe("getEntryButtonState", () => {
  const baseEvent = {
    entry_type: "normal",
    entry_start: "2024-02-22T10:00:00Z",
    entry_end: "2024-02-22T12:00:00Z",
    gender: null,
  }

  it("U01: entry_typeがinviteならinviteを返す", () => {
    const result = getEntryButtonState(
      { ...baseEvent, entry_type: "invite" },
      false,
      false,
      new Date("2024-02-22T09:00:00Z"),
    )

    expect(result).toBe("invite")
  })

  it("U02: エントリー開始前ならbefore_startを返す", () => {
    const result = getEntryButtonState(
      baseEvent,
      true,
      false,
      new Date("2024-02-22T09:59:59Z"),
    )

    expect(result).toBe("before_start")
  })

  it("U03: エントリー終了後ならclosedを返す", () => {
    const result = getEntryButtonState(
      baseEvent,
      true,
      false,
      new Date("2024-02-22T12:00:01Z"),
    )

    expect(result).toBe("closed")
  })

  it("U04: 期間内かつ未ログインならnot_logged_inを返す", () => {
    const result = getEntryButtonState(
      baseEvent,
      false,
      false,
      new Date("2024-02-22T11:00:00Z"),
    )

    expect(result).toBe("not_logged_in")
  })

  it("U05: 期間内かつログイン済みで既エントリーならcan_cancelを返す", () => {
    const result = getEntryButtonState(
      baseEvent,
      true,
      true,
      new Date("2024-02-22T11:00:00Z"),
    )

    expect(result).toBe("can_cancel")
  })

  it("U06: 期間内かつログイン済みで未エントリーかつ性別制限なしならcan_entryを返す", () => {
    const result = getEntryButtonState(
      baseEvent,
      true,
      false,
      new Date("2024-02-22T11:00:00Z"),
      "girls",
    )

    expect(result).toBe("can_entry")
  })

  it("U07: 性別制限に不一致でadminでない場合はgender_mismatchを返す", () => {
    const result = getEntryButtonState(
      { ...baseEvent, gender: "boys" },
      true,
      false,
      new Date("2024-02-22T11:00:00Z"),
      "girls",
      false,
    )

    expect(result).toBe("gender_mismatch")
  })

  it("U08: 性別不一致でもadminならcan_entryを返す", () => {
    const result = getEntryButtonState(
      { ...baseEvent, gender: "boys" },
      true,
      false,
      new Date("2024-02-22T11:00:00Z"),
      "girls",
      true,
    )

    expect(result).toBe("can_entry")
  })
})
