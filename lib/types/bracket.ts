/**
 * ブラケット（ダブルエリミネーション）関連の型定義
 */

export type BracketType = "winners" | "losers" | "grand_final"
export type BracketMatchStatus = "pending" | "ready" | "in_progress" | "confirmed"

export type TeamInfo = {
  id: string
  name: string
  seed: number
}

export type RawBracketMatch = {
  id: string
  bracket_type: BracketType
  round_number: number
  match_order: number
  team_a_id: string | null
  team_b_id: string | null
  winner_team_id: string | null
  status: BracketMatchStatus
}

export type BracketMatchForDisplay = {
  id: string
  bracketType: BracketType
  roundNumber: number
  matchOrder: number
  teamA: TeamInfo | null
  teamB: TeamInfo | null
  winner: TeamInfo | null
  status: BracketMatchStatus
}

export type BracketRound = {
  roundNumber: number
  matches: BracketMatchForDisplay[]
}

export type OrganizedBracket = {
  winners: BracketRound[]
  losers: BracketRound[]
  grandFinal: BracketRound[]
}
