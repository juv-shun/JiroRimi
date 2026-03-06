import { describe, expect, it } from "vitest"

import {
  computeTentativeResult,
  computeStandings,
} from "@/lib/utils/match-result"
import type {
  AdminMatchForDisplay,
  AdminMatchParticipant,
} from "@/lib/types/match"

function makeParticipant(
  overrides: Partial<AdminMatchParticipant> & { team: "team_a" | "team_b" },
): AdminMatchParticipant {
  return {
    profileId: overrides.profileId ?? crypto.randomUUID(),
    playerName: overrides.playerName ?? "Player",
    avatarUrl: null,
    firstRole: null,
    team: overrides.team,
    vote: overrides.vote ?? null,
  }
}

describe("computeTentativeResult", () => {
  it("Team A 全員 win, Team B 全員 lose → team_a", () => {
    const teamA = Array.from({ length: 5 }, () =>
      makeParticipant({ team: "team_a", vote: "win" }),
    )
    const teamB = Array.from({ length: 5 }, () =>
      makeParticipant({ team: "team_b", vote: "lose" }),
    )
    expect(computeTentativeResult(teamA, teamB)).toBe("team_a")
  })

  it("Team B 全員 win, Team A 全員 lose → team_b", () => {
    const teamA = Array.from({ length: 5 }, () =>
      makeParticipant({ team: "team_a", vote: "lose" }),
    )
    const teamB = Array.from({ length: 5 }, () =>
      makeParticipant({ team: "team_b", vote: "win" }),
    )
    expect(computeTentativeResult(teamA, teamB)).toBe("team_b")
  })

  it("同数の win → conflict", () => {
    const teamA = [
      makeParticipant({ team: "team_a", vote: "win" }),
      makeParticipant({ team: "team_a", vote: "win" }),
      makeParticipant({ team: "team_a", vote: "win" }),
    ]
    const teamB = [
      makeParticipant({ team: "team_b", vote: "win" }),
      makeParticipant({ team: "team_b", vote: "win" }),
      makeParticipant({ team: "team_b", vote: "win" }),
    ]
    expect(computeTentativeResult(teamA, teamB)).toBe("conflict")
  })

  it("全員 null → no_votes", () => {
    const teamA = Array.from({ length: 5 }, () =>
      makeParticipant({ team: "team_a", vote: null }),
    )
    const teamB = Array.from({ length: 5 }, () =>
      makeParticipant({ team: "team_b", vote: null }),
    )
    expect(computeTentativeResult(teamA, teamB)).toBe("no_votes")
  })

  it("一部のみ投票（Team A 2 win, Team B 1 win）→ team_a", () => {
    const teamA = [
      makeParticipant({ team: "team_a", vote: "win" }),
      makeParticipant({ team: "team_a", vote: "win" }),
      makeParticipant({ team: "team_a", vote: null }),
    ]
    const teamB = [
      makeParticipant({ team: "team_b", vote: "win" }),
      makeParticipant({ team: "team_b", vote: null }),
      makeParticipant({ team: "team_b", vote: null }),
    ]
    expect(computeTentativeResult(teamA, teamB)).toBe("team_a")
  })
})

describe("computeStandings", () => {
  it("0 試合 → 空配列", () => {
    expect(computeStandings([])).toEqual([])
  })

  it("1 試合 confirmed → 勝者チーム wins=1, 敗者チーム losses=1", () => {
    const pA = makeParticipant({
      team: "team_a",
      profileId: "a1",
      playerName: "A1",
    })
    const pB = makeParticipant({
      team: "team_b",
      profileId: "b1",
      playerName: "B1",
    })
    const matches: AdminMatchForDisplay[] = [
      {
        matchId: "m1",
        roundNumber: 1,
        lobbyNumber: null,
        status: "confirmed",
        result: "team_a",
        teamA: [pA],
        teamB: [pB],
      },
    ]
    const standings = computeStandings(matches)
    expect(standings).toHaveLength(2)
    expect(standings[0]).toMatchObject({
      profileId: "a1",
      wins: 1,
      losses: 0,
      winRate: 1,
    })
    expect(standings[1]).toMatchObject({
      profileId: "b1",
      wins: 0,
      losses: 1,
      winRate: 0,
    })
  })

  it("in_progress マッチは除外される", () => {
    const pA = makeParticipant({
      team: "team_a",
      profileId: "a1",
      playerName: "A1",
    })
    const pB = makeParticipant({
      team: "team_b",
      profileId: "b1",
      playerName: "B1",
    })
    const matches: AdminMatchForDisplay[] = [
      {
        matchId: "m1",
        roundNumber: 1,
        lobbyNumber: null,
        status: "confirmed",
        result: "team_a",
        teamA: [pA],
        teamB: [pB],
      },
      {
        matchId: "m2",
        roundNumber: 2,
        lobbyNumber: null,
        status: "in_progress",
        result: null,
        teamA: [pA],
        teamB: [pB],
      },
    ]
    const standings = computeStandings(matches)
    // in_progress は除外されるので、1試合分のみ
    expect(standings[0]).toMatchObject({ profileId: "a1", wins: 1, losses: 0 })
    expect(standings[1]).toMatchObject({ profileId: "b1", wins: 0, losses: 1 })
  })
})
