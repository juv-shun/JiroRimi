/**
 * チェックインボタンの状態を判定する純関数
 */

export type CheckinButtonState =
  | "before_checkin"
  | "can_checkin"
  | "checked_in"
  | "checkin_closed"

type EventForCheckinState = {
  checkin_start: string
  checkin_end: string
}

/**
 * チェックインボタンの状態を判定する
 *
 * 判定優先順位（上から順に評価）:
 * 1. checked_in: checkedInAt !== null（時間帯に関わらず済みを最優先）
 * 2. before_checkin: now < checkin_start
 * 3. checkin_closed: now > checkin_end
 * 4. can_checkin: checkin_start <= now <= checkin_end かつ未チェックイン
 */
export function getCheckinButtonState(
  event: EventForCheckinState,
  checkedInAt: string | null,
  now: Date,
): CheckinButtonState {
  // 1. チェックイン済みは時間帯に関わらず最優先
  if (checkedInAt !== null) return "checked_in"

  const checkinStart = new Date(event.checkin_start)
  const checkinEnd = new Date(event.checkin_end)

  // 2. チェックイン開始前
  if (now < checkinStart) return "before_checkin"
  // 3. チェックイン締切後
  if (now > checkinEnd) return "checkin_closed"
  // 4. チェックイン可能（時間帯内かつ未チェックイン）
  return "can_checkin"
}

// ボタン状態に応じたラベル
export const CHECKIN_BUTTON_LABELS: Record<CheckinButtonState, string> = {
  before_checkin: "チェックイン開始前",
  can_checkin: "チェックインする",
  checked_in: "チェックイン済み ✓",
  checkin_closed: "チェックイン締切",
}
