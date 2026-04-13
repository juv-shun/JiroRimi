import {
  datetimeLocalToTimestamptz,
  formatDateTimeJST,
  normalizeEventEntryWindow,
  timestamptzToDatetimeLocal,
} from "@/lib/utils/datetime"

describe("datetime utilities", () => {
  it("U13: datetimeLocalToTimestamptz はdatetime-localをJSTのtimestamptz形式に変換する", () => {
    const result = datetimeLocalToTimestamptz("2024-02-22T14:30")

    expect(result).toBe("2024-02-22T14:30:00+09:00")
  })

  it("U14: timestamptzToDatetimeLocal はUTCのtimestamptzをJSTのdatetime-localへ変換する", () => {
    const result = timestamptzToDatetimeLocal("2024-02-22T05:30:00Z")

    expect(result).toBe("2024-02-22T14:30")
  })

  it("U15: formatDateTimeJST はUTCのtimestamptzをYYYY/MM/DD HH:MM(JST)で整形する", () => {
    const result = formatDateTimeJST("2024-02-22T05:30:00Z")

    expect(result).toBe("2024/02/22 14:30")
  })

  it("U16: 招待制でentry_startとentry_endが空ならcheckin_start基準で補完する", () => {
    const result = normalizeEventEntryWindow({
      entry_type: "invite",
      entry_start: "",
      entry_end: "",
      checkin_start: "2024-06-15T09:00",
    })

    expect(result).toEqual({
      entry_start: "2024-06-15T08:59",
      entry_end: "2024-06-15T09:00",
    })
  })

  it("U17: オープン参加ではentry_startとentry_endをそのまま保持する", () => {
    const result = normalizeEventEntryWindow({
      entry_type: "open",
      entry_start: "2024-06-01T10:00",
      entry_end: "2024-06-14T23:59",
      checkin_start: "2024-06-15T09:00",
    })

    expect(result).toEqual({
      entry_start: "2024-06-01T10:00",
      entry_end: "2024-06-14T23:59",
    })
  })
})
