import {
  getInitialExcludedEntryIds,
  sortEntriesByEntryTimeDesc,
} from "@/app/components/start-event-modal"
import type { EntryWithProfile } from "@/lib/types/entry"

function makeEntry(
  index: number,
  createdAt: string,
  checkedInAt: string,
): EntryWithProfile {
  return {
    id: `entry-${index}`,
    created_at: createdAt,
    checked_in_at: checkedInAt,
    profiles: {
      player_name: `player-${index}`,
      avatar_url: null,
      first_role: null,
      second_role: null,
      third_role: null,
    },
  }
}

describe("start event modal exclusion defaults", () => {
  it("12人チェックイン済みの場合、エントリー日時が遅い2人を初期除外にする", () => {
    const entries = Array.from({ length: 12 }, (_, index) =>
      makeEntry(
        index + 1,
        `2026-02-22T10:${String(index).padStart(2, "0")}:00Z`,
        `2026-02-22T11:${String(11 - index).padStart(2, "0")}:00Z`,
      ),
    )

    const excludedIds = getInitialExcludedEntryIds(entries)

    expect([...excludedIds]).toEqual(["entry-12", "entry-11"])
  })

  it("チェックインが遅くてもエントリーが早い人は初期除外候補にしない", () => {
    const entries = Array.from({ length: 12 }, (_, index) =>
      makeEntry(
        index + 1,
        `2026-02-22T10:${String(index).padStart(2, "0")}:00Z`,
        index === 0
          ? "2026-02-22T12:00:00Z"
          : `2026-02-22T11:${String(index).padStart(2, "0")}:00Z`,
      ),
    )

    const excludedIds = getInitialExcludedEntryIds(entries)

    expect(excludedIds.has("entry-1")).toBe(false)
    expect([...excludedIds]).toEqual(["entry-12", "entry-11"])
  })

  it("10人ちょうどの場合、初期除外は0人にする", () => {
    const entries = Array.from({ length: 10 }, (_, index) =>
      makeEntry(
        index + 1,
        `2026-02-22T10:${String(index).padStart(2, "0")}:00Z`,
        `2026-02-22T11:${String(index).padStart(2, "0")}:00Z`,
      ),
    )

    expect(getInitialExcludedEntryIds(entries).size).toBe(0)
  })

  it("参加者リストはエントリー日時が遅い順に並べる", () => {
    const entries = [
      makeEntry(1, "2026-02-22T10:00:00Z", "2026-02-22T12:00:00Z"),
      makeEntry(2, "2026-02-22T10:02:00Z", "2026-02-22T11:00:00Z"),
      makeEntry(3, "2026-02-22T10:01:00Z", "2026-02-22T13:00:00Z"),
    ]

    expect(
      sortEntriesByEntryTimeDesc(entries).map((entry) => entry.id),
    ).toEqual(["entry-2", "entry-3", "entry-1"])
  })
})
