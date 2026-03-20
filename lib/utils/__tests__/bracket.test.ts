import { describe, expect, it } from "vitest"

import type { RawBracketMatch, TeamInfo } from "@/lib/types/bracket"

import {
  canConfirmBracketMatch,
  deriveFinalRankings,
  hasResetMatch,
  isAllBracketMatchesConfirmed,
  organizeBracketData,
} from "../bracket"

function team(seed: number): TeamInfo {
  return { id: `team-${seed}`, name: `Team ${seed}`, seed }
}

function buildTeamMap(teams: TeamInfo[]): Map<string, TeamInfo> {
  return new Map(teams.map((t) => [t.id, t]))
}

function rawMatch(
  overrides: Partial<RawBracketMatch> & {
    bracket_type: RawBracketMatch["bracket_type"]
    round_number: number
    match_order: number
  },
): RawBracketMatch {
  return {
    id: `match-${overrides.bracket_type}-${overrides.round_number}-${overrides.match_order}`,
    team_a_id: null,
    team_b_id: null,
    winner_team_id: null,
    status: "pending",
    ...overrides,
  }
}

describe("organizeBracketData", () => {
  it("空配列の場合は空のブラケットを返す", () => {
    const result = organizeBracketData([], new Map())
    expect(result).toEqual({
      winners: [],
      losers: [],
      grandFinal: [],
    })
  })

  it("6試合標準構成を正しく整理する", () => {
    const teams = [team(1), team(2), team(3), team(4)]
    const teamMap = buildTeamMap(teams)

    const matches: RawBracketMatch[] = [
      rawMatch({
        bracket_type: "winners",
        round_number: 1,
        match_order: 1,
        team_a_id: "team-1",
        team_b_id: "team-4",
        winner_team_id: "team-1",
        status: "confirmed",
      }),
      rawMatch({
        bracket_type: "winners",
        round_number: 1,
        match_order: 2,
        team_a_id: "team-2",
        team_b_id: "team-3",
        winner_team_id: "team-2",
        status: "confirmed",
      }),
      rawMatch({
        bracket_type: "winners",
        round_number: 2,
        match_order: 1,
        team_a_id: "team-1",
        team_b_id: "team-2",
        status: "ready",
      }),
      rawMatch({
        bracket_type: "losers",
        round_number: 1,
        match_order: 1,
        team_a_id: "team-4",
        team_b_id: "team-3",
        winner_team_id: "team-3",
        status: "confirmed",
      }),
      rawMatch({
        bracket_type: "losers",
        round_number: 2,
        match_order: 1,
        status: "pending",
      }),
      rawMatch({
        bracket_type: "grand_final",
        round_number: 1,
        match_order: 1,
        status: "pending",
      }),
    ]

    const result = organizeBracketData(matches, teamMap)

    // Winners: 2ラウンド（R1: 2試合, R2: 1試合）
    expect(result.winners).toHaveLength(2)
    expect(result.winners[0].roundNumber).toBe(1)
    expect(result.winners[0].matches).toHaveLength(2)
    expect(result.winners[1].roundNumber).toBe(2)
    expect(result.winners[1].matches).toHaveLength(1)

    // Losers: 2ラウンド（R1: 1試合, R2: 1試合）
    expect(result.losers).toHaveLength(2)
    expect(result.losers[0].matches).toHaveLength(1)
    expect(result.losers[1].matches).toHaveLength(1)

    // Grand Final: 1ラウンド（1試合）
    expect(result.grandFinal).toHaveLength(1)
    expect(result.grandFinal[0].matches).toHaveLength(1)

    // チーム解決の確認
    const wr1m1 = result.winners[0].matches[0]
    expect(wr1m1.teamA).toEqual(team(1))
    expect(wr1m1.teamB).toEqual(team(4))
    expect(wr1m1.winner).toEqual(team(1))
    expect(wr1m1.status).toBe("confirmed")
  })

  it("pending状態でteam_idがnullの場合はnullを返す", () => {
    const result = organizeBracketData(
      [
        rawMatch({
          bracket_type: "grand_final",
          round_number: 1,
          match_order: 1,
          team_a_id: null,
          team_b_id: null,
        }),
      ],
      new Map(),
    )

    const match = result.grandFinal[0].matches[0]
    expect(match.teamA).toBeNull()
    expect(match.teamB).toBeNull()
  })

  it("teamMapに存在しないIDの場合はnullを返す", () => {
    const result = organizeBracketData(
      [
        rawMatch({
          bracket_type: "winners",
          round_number: 1,
          match_order: 1,
          team_a_id: "unknown-id",
          team_b_id: null,
        }),
      ],
      new Map(),
    )

    expect(result.winners[0].matches[0].teamA).toBeNull()
  })
})

describe("hasResetMatch", () => {
  it("リセットマッチ（round_number=2）がある場合はtrueを返す", () => {
    const result = organizeBracketData(
      [
        rawMatch({
          bracket_type: "grand_final",
          round_number: 1,
          match_order: 1,
        }),
        rawMatch({
          bracket_type: "grand_final",
          round_number: 2,
          match_order: 1,
        }),
      ],
      new Map(),
    )
    expect(hasResetMatch(result.grandFinal)).toBe(true)
  })

  it("リセットマッチがない場合はfalseを返す", () => {
    const result = organizeBracketData(
      [
        rawMatch({
          bracket_type: "grand_final",
          round_number: 1,
          match_order: 1,
        }),
      ],
      new Map(),
    )
    expect(hasResetMatch(result.grandFinal)).toBe(false)
  })
})

describe("isAllBracketMatchesConfirmed", () => {
  it("全confirmed → true", () => {
    const matches: RawBracketMatch[] = [
      rawMatch({ bracket_type: "winners", round_number: 1, match_order: 1, status: "confirmed" }),
      rawMatch({ bracket_type: "losers", round_number: 1, match_order: 1, status: "confirmed" }),
    ]
    expect(isAllBracketMatchesConfirmed(matches)).toBe(true)
  })

  it("pending含む → false", () => {
    const matches: RawBracketMatch[] = [
      rawMatch({ bracket_type: "winners", round_number: 1, match_order: 1, status: "confirmed" }),
      rawMatch({ bracket_type: "losers", round_number: 1, match_order: 1, status: "pending" }),
    ]
    expect(isAllBracketMatchesConfirmed(matches)).toBe(false)
  })

  it("空配列 → true", () => {
    expect(isAllBracketMatchesConfirmed([])).toBe(true)
  })
})

describe("deriveFinalRankings", () => {
  const teams = [team(1), team(2), team(3), team(4)]
  const teamMap = buildTeamMap(teams)

  // 標準完了（Reset無し）: Seed1優勝、Seed2準優勝、Seed3 3位、Seed4 4位
  function buildStandardCompleteMatches(): RawBracketMatch[] {
    return [
      rawMatch({ bracket_type: "winners", round_number: 1, match_order: 1, team_a_id: "team-1", team_b_id: "team-4", winner_team_id: "team-1", status: "confirmed" }),
      rawMatch({ bracket_type: "winners", round_number: 1, match_order: 2, team_a_id: "team-2", team_b_id: "team-3", winner_team_id: "team-2", status: "confirmed" }),
      rawMatch({ bracket_type: "winners", round_number: 2, match_order: 1, team_a_id: "team-1", team_b_id: "team-2", winner_team_id: "team-1", status: "confirmed" }),
      rawMatch({ bracket_type: "losers", round_number: 1, match_order: 1, team_a_id: "team-4", team_b_id: "team-3", winner_team_id: "team-3", status: "confirmed" }),
      rawMatch({ bracket_type: "losers", round_number: 2, match_order: 1, team_a_id: "team-2", team_b_id: "team-3", winner_team_id: "team-3", status: "confirmed" }),
      rawMatch({ bracket_type: "grand_final", round_number: 1, match_order: 1, team_a_id: "team-1", team_b_id: "team-3", winner_team_id: "team-1", status: "confirmed" }),
    ]
  }

  it("Reset無し標準完了 → 正しい順位", () => {
    const result = deriveFinalRankings(buildStandardCompleteMatches(), teamMap)
    expect(result).toEqual([
      { rank: 1, team: team(1) },
      { rank: 2, team: team(3) },
      { rank: 3, team: team(2) },
      { rank: 4, team: team(4) },
    ])
  })

  it("Reset有り → Reset勝者が1位", () => {
    const matches: RawBracketMatch[] = [
      ...buildStandardCompleteMatches().slice(0, 5),
      // GF R1: LB側(team-3)が勝利
      rawMatch({ bracket_type: "grand_final", round_number: 1, match_order: 1, team_a_id: "team-1", team_b_id: "team-3", winner_team_id: "team-3", status: "confirmed" }),
      // Reset: team-1が勝利
      rawMatch({ bracket_type: "grand_final", round_number: 2, match_order: 1, team_a_id: "team-1", team_b_id: "team-3", winner_team_id: "team-1", status: "confirmed" }),
    ]
    const result = deriveFinalRankings(matches, teamMap)
    expect(result[0]).toEqual({ rank: 1, team: team(1) })
    expect(result[1]).toEqual({ rank: 2, team: team(3) })
  })

  it("未完了 → 空配列", () => {
    const matches: RawBracketMatch[] = [
      rawMatch({ bracket_type: "winners", round_number: 1, match_order: 1, status: "ready", team_a_id: "team-1", team_b_id: "team-4" }),
      rawMatch({ bracket_type: "winners", round_number: 1, match_order: 2, status: "ready", team_a_id: "team-2", team_b_id: "team-3" }),
      rawMatch({ bracket_type: "grand_final", round_number: 1, match_order: 1, status: "pending" }),
    ]
    expect(deriveFinalRankings(matches, teamMap)).toEqual([])
  })
})

describe("canConfirmBracketMatch", () => {
  it("ready + 両チームあり → true", () => {
    expect(
      canConfirmBracketMatch({
        id: "m1",
        bracketType: "winners",
        roundNumber: 1,
        matchOrder: 1,
        teamA: team(1),
        teamB: team(2),
        winner: null,
        status: "ready",
      }),
    ).toBe(true)
  })

  it("pending → false", () => {
    expect(
      canConfirmBracketMatch({
        id: "m1",
        bracketType: "winners",
        roundNumber: 1,
        matchOrder: 1,
        teamA: null,
        teamB: null,
        winner: null,
        status: "pending",
      }),
    ).toBe(false)
  })
})
