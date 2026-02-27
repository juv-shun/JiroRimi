/**
 * ロビーボタンの状態を判定する純関数
 */

export type LobbyButtonState =
  | "not_entered"
  | "no_active_match"
  | "can_enter"

/**
 * ロビーボタンの状態を判定する
 *
 * 判定優先順位（上から順に評価）:
 * 1. not_entered: 未エントリー
 * 2. no_active_match: エントリー済みだが in_progress マッチなし
 * 3. can_enter: エントリー済みかつ in_progress マッチあり
 */
export function getLobbyButtonState(
  isEntered: boolean,
  hasInProgressMatch: boolean,
): LobbyButtonState {
  if (!isEntered) return "not_entered"
  if (!hasInProgressMatch) return "no_active_match"
  return "can_enter"
}

// ボタン状態に応じたラベル（全状態で統一）
export const LOBBY_BUTTON_LABELS: Record<LobbyButtonState, string> = {
  not_entered: "ロビーに入る",
  no_active_match: "ロビーに入る",
  can_enter: "ロビーに入る",
}
