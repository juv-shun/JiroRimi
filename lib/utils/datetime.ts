/**
 * 日時変換ユーティリティ
 */

/** datetime-local の値を timestamptz（JST）に変換 */
export const datetimeLocalToTimestamptz = (dt: string): string =>
  `${dt}:00+09:00`

type NormalizeEventEntryWindowInput = {
  entry_type: "open" | "invite"
  entry_start: string
  entry_end: string
  checkin_start: string
}

/** DB の timestamptz を datetime-local 形式（JST）に変換 */
export const timestamptzToDatetimeLocal = (timestamptz: string): string => {
  const date = new Date(timestamptz)
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const yyyy = jst.getUTCFullYear()
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(jst.getUTCDate()).padStart(2, "0")
  const hh = String(jst.getUTCHours()).padStart(2, "0")
  const min = String(jst.getUTCMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

/** 日付を YYYY/MM/DD 形式（JST）でフォーマット */
export const formatDateJST = (dateString: string): string =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(dateString))

/** 時刻を HH:MM 形式（JST）でフォーマット */
export const formatTimeJST = (timestamptz: string): string =>
  new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
    hour12: false,
  }).format(new Date(timestamptz))

/** 日時を YYYY/MM/DD HH:MM 形式（JST）でフォーマット */
export const formatDateTimeJST = (timestamptz: string): string =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
    hour12: false,
  }).format(new Date(timestamptz))

/**
 * 招待制イベントでは entry_start / entry_end を使わないため、
 * 未入力時は checkin_start を基準に有効な時系列へ正規化する。
 */
export const normalizeEventEntryWindow = ({
  entry_type,
  entry_start,
  entry_end,
  checkin_start,
}: NormalizeEventEntryWindowInput): {
  entry_start: string
  entry_end: string
} => {
  if (entry_type === "open") {
    return { entry_start, entry_end }
  }

  const normalizedEntryEnd = entry_end || checkin_start
  if (entry_start) {
    return { entry_start, entry_end: normalizedEntryEnd }
  }

  const baseDate = new Date(datetimeLocalToTimestamptz(normalizedEntryEnd))
  const oneMinuteBefore = new Date(baseDate.getTime() - 60 * 1000)

  return {
    entry_start: timestamptzToDatetimeLocal(oneMinuteBefore.toISOString()),
    entry_end: normalizedEntryEnd,
  }
}
