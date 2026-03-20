import type {
  BracketMatchForDisplay,
  BracketRound,
  BracketType,
  OrganizedBracket,
  RawBracketMatch,
  TeamInfo,
} from "@/lib/types/bracket"

/**
 * RawBracketMatch 配列を Winners / Losers / Grand Final に整理する。
 *
 * Args:
 *   rawMatches: DB から取得した生データ
 *   teamMap: team_id → TeamInfo のマップ
 *
 * Returns:
 *   OrganizedBracket: 3セクションに整理されたブラケットデータ
 */
export function organizeBracketData(
  rawMatches: RawBracketMatch[],
  teamMap: Map<string, TeamInfo>,
): OrganizedBracket {
  const grouped: Record<BracketType, RawBracketMatch[]> = {
    winners: [],
    losers: [],
    grand_final: [],
  }

  for (const match of rawMatches) {
    grouped[match.bracket_type].push(match)
  }

  const toRounds = (matches: RawBracketMatch[]): BracketRound[] => {
    const roundMap = new Map<number, BracketMatchForDisplay[]>()

    for (const m of matches) {
      const display: BracketMatchForDisplay = {
        id: m.id,
        bracketType: m.bracket_type,
        roundNumber: m.round_number,
        matchOrder: m.match_order,
        teamA: m.team_a_id ? (teamMap.get(m.team_a_id) ?? null) : null,
        teamB: m.team_b_id ? (teamMap.get(m.team_b_id) ?? null) : null,
        winner: m.winner_team_id
          ? (teamMap.get(m.winner_team_id) ?? null)
          : null,
        status: m.status,
      }

      const existing = roundMap.get(m.round_number)
      if (existing) {
        existing.push(display)
      } else {
        roundMap.set(m.round_number, [display])
      }
    }

    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, matches]) => ({
        roundNumber,
        matches: matches.sort((a, b) => a.matchOrder - b.matchOrder),
      }))
  }

  return {
    winners: toRounds(grouped.winners),
    losers: toRounds(grouped.losers),
    grandFinal: toRounds(grouped.grand_final),
  }
}

/**
 * Grand Final にリセットマッチ（round_number === 2）が存在するか判定する。
 */
export function hasResetMatch(grandFinalRounds: BracketRound[]): boolean {
  return grandFinalRounds.some((r) => r.roundNumber === 2)
}
