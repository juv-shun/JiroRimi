import type {
  AdminMatchForDisplay,
  AdminMatchParticipant,
  PlayerStanding,
  TentativeResult,
} from "@/lib/types/match"

/**
 * チーム投票から仮結果を算出する。
 *
 * Args:
 *   teamA: Team A の参加者リスト
 *   teamB: Team B の参加者リスト
 *
 * Returns:
 *   TentativeResult: 仮結果
 */
export function computeTentativeResult(
  teamA: AdminMatchParticipant[],
  teamB: AdminMatchParticipant[],
): TentativeResult {
  const teamAWins = teamA.filter((p) => p.vote === "win").length
  const teamBWins = teamB.filter((p) => p.vote === "win").length

  if (teamAWins === 0 && teamBWins === 0) return "no_votes"
  if (teamAWins > teamBWins) return "team_a"
  if (teamBWins > teamAWins) return "team_b"
  return "conflict"
}

/**
 * confirmed マッチから累計成績を算出する。
 *
 * Args:
 *   matches: マッチリスト
 *
 * Returns:
 *   PlayerStanding[]: 勝数降順 → 勝率降順でソート済み
 */
export function computeStandings(
  matches: AdminMatchForDisplay[],
): PlayerStanding[] {
  const map = new Map<
    string,
    {
      playerName: string | null
      avatarUrl: string | null
      wins: number
      losses: number
    }
  >()

  for (const match of matches) {
    if (match.status !== "confirmed" || !match.result) continue

    const allParticipants = [...match.teamA, ...match.teamB]
    for (const p of allParticipants) {
      if (!map.has(p.profileId)) {
        map.set(p.profileId, {
          playerName: p.playerName,
          avatarUrl: p.avatarUrl,
          wins: 0,
          losses: 0,
        })
      }
      const entry = map.get(p.profileId)!
      if (p.team === match.result) {
        entry.wins++
      } else {
        entry.losses++
      }
    }
  }

  const standings: PlayerStanding[] = []
  for (const [profileId, entry] of map) {
    const total = entry.wins + entry.losses
    standings.push({
      profileId,
      playerName: entry.playerName,
      avatarUrl: entry.avatarUrl,
      wins: entry.wins,
      losses: entry.losses,
      winRate: total > 0 ? entry.wins / total : 0,
    })
  }

  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.winRate - a.winRate
  })

  return standings
}
