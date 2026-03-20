import { describe, expect, it } from "vitest"

import type { RawBracketMatch, TeamInfo } from "@/lib/types/bracket"

import { hasResetMatch, organizeBracketData } from "../bracket"

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
