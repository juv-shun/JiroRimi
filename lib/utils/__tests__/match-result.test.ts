import { describe, expect, it } from "vitest"

import type { PlayerStanding } from "@/lib/types/match"

import { computeRankings } from "../match-result"

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
