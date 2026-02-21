/**
 * エントリーボタンの状態を判定する純関数
 */

export type EntryButtonState =
  | "invite"
  | "not_logged_in"
  | "before_start"
  | "gender_mismatch"
  | "can_entry"
  | "can_cancel"
  | "closed"

type EventForButtonState = {
  entry_type: string
  entry_start: string
  entry_end: string
  gender: string | null
}

/**
 * エントリーボタンの状態を判定する
 *
 * 判定優先順位（上から順に評価）:
 * 1. invite: event.entry_type === "invite"
 * 2. before_start: now < entry_start
 * 3. closed: now > entry_end（entry_end まではエントリー可能）
 * 4. not_logged_in: !isLoggedIn
 * 5. gender_mismatch: event.gender が設定されており、userGender と不一致
 * 6. can_cancel: isEntered === true
 * 7. can_entry: isEntered === false
 */
export function getEntryButtonState(
  event: EventForButtonState,
  isLoggedIn: boolean,
  isEntered: boolean,
  now: Date,
  userGender: string | null = null,
): EntryButtonState {
  // 1. 招待制チェック（entry_type === "invite"）
  if (event.entry_type === "invite") return "invite"

  const entryStart = new Date(event.entry_start)
  const entryEnd = new Date(event.entry_end)

  // 2. エントリー開始前
  if (now < entryStart) return "before_start"
  // 3. エントリー締切後（entry_end を超えた場合のみ締切）
  if (now > entryEnd) return "closed"
  // 4. ログインチェック
  if (!isLoggedIn) return "not_logged_in"
  // 5. 性別制限チェック
  if (event.gender && event.gender !== userGender) return "gender_mismatch"
  // 6-7. エントリー期間中（entry_start <= now <= entry_end）
  return isEntered ? "can_cancel" : "can_entry"
}

// ボタン状態に応じたラベル
export const ENTRY_BUTTON_LABELS: Record<EntryButtonState, string> = {
  invite: "招待制",
  not_logged_in: "ログインしてエントリー",
  before_start: "エントリー開始前",
  gender_mismatch: "参加対象外",
  can_entry: "エントリーする",
  can_cancel: "キャンセルする",
  closed: "エントリー締切",
}
