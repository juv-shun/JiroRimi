import { eventSchema } from "@/lib/validations/tournament"

describe("eventSchema", () => {
  const VALID_EVENT_INPUT = {
    name: "予選1",
    entry_type: "open" as const,
    match_format: "qualifier" as const,
    matches_per_event: 3,
    max_participants: null,
    scheduled_date: "2024-06-15",
    entry_start: "2024-06-01T10:00",
    entry_end: "2024-06-14T23:59",
    checkin_start: "2024-06-15T09:00",
    checkin_end: "2024-06-15T10:00",
    gender: null,
    rules: undefined,
  }

  it("U24: qualifierでmatches_per_eventが指定されていればparse成功する", () => {
    expect(() => eventSchema.parse(VALID_EVENT_INPUT)).not.toThrow()
  })

  it("チェックイン期間中もエントリー受付中ならparse成功する", () => {
    expect(() =>
      eventSchema.parse({
        ...VALID_EVENT_INPUT,
        entry_end: "2024-06-15T09:30",
        checkin_start: "2024-06-15T09:00",
      }),
    ).not.toThrow()
  })

  it("エントリー締切がエントリー開始以前なら失敗する", () => {
    const result = eventSchema.safeParse({
      ...VALID_EVENT_INPUT,
      entry_end: VALID_EVENT_INPUT.entry_start,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === "entry_end"),
      ).toBe(true)
    }
  })

  it("チェックイン締切がチェックイン開始以前なら失敗する", () => {
    const result = eventSchema.safeParse({
      ...VALID_EVENT_INPUT,
      checkin_end: VALID_EVENT_INPUT.checkin_start,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === "checkin_end"),
      ).toBe(true)
    }
  })

  it("U25: qualifierでmatches_per_eventがnullなら失敗する", () => {
    const result = eventSchema.safeParse({
      ...VALID_EVENT_INPUT,
      matches_per_event: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path[0] === "matches_per_event",
        ),
      ).toBe(true)
    }
  })

  it("U27: eventIdに文字列を指定してparse成功する", () => {
    expect(() =>
      eventSchema.parse({
        ...VALID_EVENT_INPUT,
        eventId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).not.toThrow()
  })

  it("U28: eventId未指定（optional）でparse成功する", () => {
    expect(() => eventSchema.parse(VALID_EVENT_INPUT)).not.toThrow()
  })

  it("U26: double_eliminationでmatches_per_eventがnull以外なら失敗する", () => {
    const result = eventSchema.safeParse({
      ...VALID_EVENT_INPUT,
      match_format: "double_elimination",
      matches_per_event: 5,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path[0] === "matches_per_event",
        ),
      ).toBe(true)
    }
  })
})
