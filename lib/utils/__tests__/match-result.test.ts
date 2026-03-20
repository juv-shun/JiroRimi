import { describe, expect, it } from "vitest"

import type { PlayerStanding } from "@/lib/types/match"

import { computeRankings, mergeStandings } from "../match-result"

function standing(
  id: string,
  wins: number,
  losses: number,
): PlayerStanding {
  const total = wins + losses
  return {
    profileId: id,
    playerName: `Player ${id}`,
    avatarUrl: null,
    wins,
    losses,
    winRate: total > 0 ? wins / total : 0,
  }
}

describe("computeRankings", () => {
  it("勝利数降順で順位を付与する", () => {
    const standings = [standing("a", 3, 0), standing("b", 2, 1), standing("c", 1, 2)]
    const result = computeRankings(standings)
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it("同勝利数は同順位を付与する", () => {
    const standings = [standing("a", 3, 0), standing("b", 2, 1), standing("c", 2, 1)]
    const result = computeRankings(standings)
    expect(result.map((r) => r.rank)).toEqual([1, 2, 2])
  })

  it("同順位の次はスキップする（1,2,2,4）", () => {
    const standings = [
      standing("a", 3, 0),
      standing("b", 2, 1),
      standing("c", 2, 1),
      standing("d", 1, 2),
    ]
    const result = computeRankings(standings)
    expect(result.map((r) => r.rank)).toEqual([1, 2, 2, 4])
  })

  it("空配列を渡すと空配列を返す", () => {
    expect(computeRankings([])).toEqual([])
  })

  it("元のPlayerStandingフィールドを保持する", () => {
    const standings = [standing("x", 5, 2)]
    const result = computeRankings(standings)
    expect(result[0]).toMatchObject({
      profileId: "x",
      playerName: "Player x",
      wins: 5,
      losses: 2,
      rank: 1,
    })
  })
})

describe("mergeStandings", () => {
  it("複数イベントの成績をprofileIdで合算する", () => {
    const event1 = [standing("a", 3, 1), standing("b", 2, 2)]
    const event2 = [standing("a", 2, 0), standing("c", 1, 1)]
    const result = mergeStandings([event1, event2])

    expect(result).toHaveLength(3)
    // a: 5W 1L
    expect(result.find((r) => r.profileId === "a")).toMatchObject({ wins: 5, losses: 1 })
    // b: 2W 2L
    expect(result.find((r) => r.profileId === "b")).toMatchObject({ wins: 2, losses: 2 })
    // c: 1W 1L
    expect(result.find((r) => r.profileId === "c")).toMatchObject({ wins: 1, losses: 1 })
  })

  it("空配列を渡すと空配列を返す", () => {
    expect(mergeStandings([])).toEqual([])
    expect(mergeStandings([[]])).toEqual([])
  })

  it("単一イベントはそのまま返す", () => {
    const event1 = [standing("a", 3, 0), standing("b", 1, 2)]
    const result = mergeStandings([event1])

    expect(result).toHaveLength(2)
    expect(result[0].profileId).toBe("a")
    expect(result[1].profileId).toBe("b")
  })
})
