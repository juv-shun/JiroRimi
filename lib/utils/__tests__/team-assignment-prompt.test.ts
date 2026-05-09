import { describe, expect, it } from "vitest"
import { buildTeamAssignmentPrompt } from "../team-assignment-prompt"

const makeParticipant = (
  id: string,
  firstRole:
    | "top_carry"
    | "bot_carry"
    | "mid"
    | "tank"
    | "support"
    | null = null,
  secondRole:
    | "top_carry"
    | "bot_carry"
    | "mid"
    | "tank"
    | "support"
    | null = null,
  thirdRole:
    | "top_carry"
    | "bot_carry"
    | "mid"
    | "tank"
    | "support"
    | null = null,
) => ({
  profileId: id,
  firstRole,
  secondRole,
  thirdRole,
})

describe("buildTeamAssignmentPrompt", () => {
  it("成績なし（空 standingsMap）→ プロンプトに勝率情報が含まれない", () => {
    const prompt = buildTeamAssignmentPrompt({
      participants: [makeParticipant("p1", "mid")],
      matchCount: 1,
      standingsMap: {},
    })

    expect(prompt).not.toContain("勝率")
    expect(prompt).not.toContain("成績")
    expect(prompt).toContain("ロール分散")
  })

  it("成績あり → プロンプトに勝率情報が含まれる", () => {
    const prompt = buildTeamAssignmentPrompt({
      participants: [makeParticipant("p1", "mid")],
      matchCount: 1,
      standingsMap: { p1: { wins: 2, losses: 1 } },
    })

    expect(prompt).toContain("勝率")
    expect(prompt).toContain("2勝1敗")
    expect(prompt).toContain("67%")
    expect(prompt).toContain("勝敗数が同じ、または近い参加者同士")
  })

  it("直前の編成案がある場合 → 同じ5人のチームを避ける指示が含まれる", () => {
    const prompt = buildTeamAssignmentPrompt({
      participants: [makeParticipant("p1", "mid")],
      matchCount: 1,
      standingsMap: { p1: { wins: 2, losses: 1 } },
      previousTeams: [
        {
          teamA: ["p1", "p2", "p3", "p4", "p5"],
          teamB: ["p6", "p7", "p8", "p9", "p10"],
        },
      ],
    })

    expect(prompt).toContain("直前の編成案と同じ5人のチームを作らない")
    expect(prompt).toContain("## 避けたい直前の編成案")
    expect(prompt).toContain("試合1 TeamA: p1, p2, p3, p4, p5")
    expect(prompt).toContain("試合1 TeamB: p6, p7, p8, p9, p10")
  })

  it("全参加者IDがプロンプトに含まれる", () => {
    const participants = Array.from({ length: 10 }, (_, i) =>
      makeParticipant(`player-${i}`, "mid"),
    )
    const prompt = buildTeamAssignmentPrompt({
      participants,
      matchCount: 1,
      standingsMap: {},
    })

    for (const p of participants) {
      expect(prompt).toContain(p.profileId)
    }
  })

  it("ロール null の参加者でもエラーにならない", () => {
    const prompt = buildTeamAssignmentPrompt({
      participants: [makeParticipant("p1", null, null, null)],
      matchCount: 1,
      standingsMap: {},
    })

    expect(prompt).toContain("p1")
    expect(prompt).toContain("なし")
  })

  it("matchCount がプロンプトに含まれる", () => {
    const prompt = buildTeamAssignmentPrompt({
      participants: [makeParticipant("p1")],
      matchCount: 3,
      standingsMap: {},
    })

    expect(prompt).toContain("3試合")
  })
})
