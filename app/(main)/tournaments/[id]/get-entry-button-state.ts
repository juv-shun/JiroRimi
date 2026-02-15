/**
 * エントリーボタンの状態を判定する純関数
 */

export type EntryButtonState =
  | "invite"
  | "not_logged_in"
  | "before_start"
  | "can_entry"
  | "can_cancel"
  | "closed"

type EventForButtonState = {
  entry_type: string
  entry_start: string
  entry_end: string
}

/**
 * エントリーボタンの状態を判定する
 *
 * 判定優先順位（上から順に評価）:
 * 1. invite: event.entry_type === "invite"
 * 2. not_logged_in: !isLoggedIn
 * 3. before_start: now < entry_start
 * 4. closed: now > entry_end（entry_end まではエントリー可能）
 * 5. can_cancel: isEntered === true
 * 6. can_entry: isEntered === false
 */
export function getEntryButtonState(
  event: EventForButtonState,
  isLoggedIn: boolean,
  isEntered: boolean,
  now: Date,
): EntryButtonState {
  // 1. 招待制チェック（entry_type === "invite"）
  if (event.entry_type === "invite") return "invite"
  // 2. ログインチェック
  if (!isLoggedIn) return "not_logged_in"

  const entryStart = new Date(event.entry_start)
  const entryEnd = new Date(event.entry_end)

  // 3. エントリー開始前
  if (now < entryStart) return "before_start"
  // 4. エントリー締切後（entry_end を超えた場合のみ締切）
  if (now > entryEnd) return "closed"
  // 5-6. エントリー期間中（entry_start <= now <= entry_end）
  return isEntered ? "can_cancel" : "can_entry"
}

// ボタン状態に応じたラベル
export const ENTRY_BUTTON_LABELS: Record<EntryButtonState, string> = {
  invite: "招待制",
  not_logged_in: "ログインしてエントリー",
  before_start: "エントリー開始前",
  can_entry: "エントリーする",
  can_cancel: "キャンセルする",
  closed: "エントリー締切",
}
