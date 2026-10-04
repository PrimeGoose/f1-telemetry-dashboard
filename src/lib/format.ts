/** 85.347 -> "1:25.347" */
export function formatLapTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '–:––.–––'
  const totalMs = Math.round(seconds * 1000)
  const m = Math.floor(totalMs / 60000)
  const s = Math.floor((totalMs % 60000) / 1000)
  const ms = totalMs % 1000
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

/** Sector style: 28.412 */
export function formatSector(seconds: number): string {
  return seconds.toFixed(3)
}

/** +0.123 / -0.456 / 0.000 */
export function formatDelta(seconds: number): string {
  if (Math.abs(seconds) < 0.0005) return '0.000'
  return `${seconds > 0 ? '+' : '−'}${Math.abs(seconds).toFixed(3)}`
}
