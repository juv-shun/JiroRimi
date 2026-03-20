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

/**
 * 全マッチが confirmed か判定する。
 */
export function isAllBracketMatchesConfirmed(
  matches: RawBracketMatch[],
): boolean {
  return matches.every((m) => m.status === "confirmed")
}

/**
 * ブラケット結果から最終順位を導出する（1位〜4位）。
 *
 * 全マッチが confirmed でない場合は空配列を返す。
 *
 * ロジック:
 *   1位: GF R1（またはReset R2）の winner_team_id
 *   2位: GF R1（またはReset R2）の敗者
 *   3位: LF（losers, round=2）の敗者
 *   4位: LR1（losers, round=1）の敗者
 */
export function deriveFinalRankings(
  matches: RawBracketMatch[],
  teamMap: Map<string, TeamInfo>,
): { rank: number; team: TeamInfo }[] {
  if (matches.length === 0) return []
  if (!isAllBracketMatchesConfirmed(matches)) return []

  const findMatch = (
    bracketType: BracketType,
    roundNumber: number,
  ): RawBracketMatch | undefined =>
    matches.find(
      (m) =>
        m.bracket_type === bracketType && m.round_number === roundNumber,
    )

  // Reset があればそちらが最終戦、なければ GF R1
  const resetMatch = findMatch("grand_final", 2)
  const finalMatch = resetMatch ?? findMatch("grand_final", 1)
  const lf = findMatch("losers", 2)
  const lr1 = findMatch("losers", 1)

  if (!finalMatch) return []

  const getLoser = (
    m: RawBracketMatch,
  ): string | null => {
    if (!m.winner_team_id || !m.team_a_id || !m.team_b_id) return null
    return m.winner_team_id === m.team_a_id ? m.team_b_id : m.team_a_id
  }

  const rankings: { rank: number; team: TeamInfo }[] = []

  const first = finalMatch.winner_team_id
    ? teamMap.get(finalMatch.winner_team_id)
    : undefined
  if (first) rankings.push({ rank: 1, team: first })

  const secondId = getLoser(finalMatch)
  const second = secondId ? teamMap.get(secondId) : undefined
  if (second) rankings.push({ rank: 2, team: second })

  if (lf) {
    const thirdId = getLoser(lf)
    const third = thirdId ? teamMap.get(thirdId) : undefined
    if (third) rankings.push({ rank: 3, team: third })
  }

  if (lr1) {
    const fourthId = getLoser(lr1)
    const fourth = fourthId ? teamMap.get(fourthId) : undefined
    if (fourth) rankings.push({ rank: 4, team: fourth })
  }

  return rankings
}

/**
 * 確定操作が可能か判定する。
 *
 * ready または in_progress で両チームが揃っている場合に true。
 */
export function canConfirmBracketMatch(
  match: BracketMatchForDisplay,
): boolean {
  return (
    (match.status === "ready" || match.status === "in_progress") &&
    match.teamA !== null &&
    match.teamB !== null
  )
}
