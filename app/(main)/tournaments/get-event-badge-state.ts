/**
 * イベントカードのステータスバッジ状態を判定する純関数
 */

export type EventBadgeState =
  | "none"
  | "entered"
  | "checked_in"
  | "in_progress"
  | "completed"

type EventForBadgeState = {
  status?: string
}

type EntryInfoForBadge = {
  checked_in_at: string | null
}

/**
 * イベントバッジの表示状態を判定する
 *
 * 判定ロジック:
 * 1. none: エントリーしていない（entryInfo が undefined）
 * 2. entered: エントリー済み && 未チェックイン
 * 3. checked_in: チェックイン済み && event.status が in_progress でも completed でもない
 * 4. in_progress: チェックイン済み && event.status === "in_progress"
 * 5. completed: チェックイン済み && event.status === "completed"
 *
 * ポイント: 未チェックインの場合、イベントが in_progress/completed でも entered のまま
 */
export function getEventBadgeState(
  event: EventForBadgeState,
  entryInfo: EntryInfoForBadge | undefined,
): EventBadgeState {
  // 未エントリー
  if (!entryInfo) return "none"

  // 未チェックイン → イベント状態に関わらず entered
  if (!entryInfo.checked_in_at) return "entered"

  // チェックイン済み → イベント状態で分岐
  if (event.status === "in_progress") return "in_progress"
  if (event.status === "completed") return "completed"

  return "checked_in"
}

export const EVENT_BADGE_LABELS: Record<Exclude<EventBadgeState, "none">, string> = {
  entered: "エントリー済",
  checked_in: "チェックイン済",
  in_progress: "イベント参加中",
  completed: "イベント参加済",
}
