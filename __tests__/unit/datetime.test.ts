import {
  datetimeLocalToTimestamptz,
  formatDateTimeJST,
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
})
