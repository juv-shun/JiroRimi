/**
 * チェックインボタンの状態を判定する純関数
 */

export type CheckinButtonState =
  | "not_entered"
  | "before_checkin"
  | "can_checkin"
  | "checked_in"
  | "checkin_closed"
  | "event_started"

type EventForCheckinState = {
  checkin_start: string
  checkin_end: string
  status?: string
}

/**
 * チェックインボタンの状態を判定する
 *
 * 判定優先順位（上から順に評価）:
 * 1. not_entered: 未エントリー（最優先）
 * 2. checked_in: checkedInAt !== null（時間帯に関わらず済みを優先）
 * 3. event_started: event.status === "in_progress"（イベント開始後は非活性）
 * 4. before_checkin: now < checkin_start
 * 5. checkin_closed: now > checkin_end
 * 6. can_checkin: checkin_start <= now <= checkin_end かつ未チェックイン
 */
export function getCheckinButtonState(
  event: EventForCheckinState,
  checkedInAt: string | null,
  now: Date,
  isEntered: boolean,
): CheckinButtonState {
  // 1. 未エントリーは最優先
  if (!isEntered) return "not_entered"

  // 2. チェックイン済みは時間帯に関わらず優先
  if (checkedInAt !== null) return "checked_in"

  // 3. イベント開始後は非活性
  if (event.status === "in_progress") return "event_started"

  const checkinStart = new Date(event.checkin_start)
  const checkinEnd = new Date(event.checkin_end)

  // 4. チェックイン開始前
  if (now < checkinStart) return "before_checkin"
  // 5. チェックイン締切後
  if (now > checkinEnd) return "checkin_closed"
  // 6. チェックイン可能（時間帯内かつ未チェックイン）
  return "can_checkin"
}

// ボタン状態に応じたラベル
export const CHECKIN_BUTTON_LABELS: Record<CheckinButtonState, string> = {
  not_entered: "チェックイン",
  before_checkin: "チェックイン開始前",
  can_checkin: "チェックインする",
  checked_in: "チェックイン済み ✓",
  checkin_closed: "チェックイン締切",
  event_started: "チェックイン締切",
}
