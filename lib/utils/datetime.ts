/**
 * 日時変換ユーティリティ
 */

/** datetime-local の値を timestamptz（JST）に変換 */
export const datetimeLocalToTimestamptz = (dt: string): string =>
  `${dt}:00+09:00`

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
