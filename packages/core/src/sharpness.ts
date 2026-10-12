import type { LogEvent } from './log'

// Groups the person's own 1-5 sharpness ratings by when each session started. Time-of-day effects vary by
// person and task and heart rate can't show them, so self-report is the only input. The bucket edges are
// our own choice; the first one also catches sessions started after midnight, and its label says so.
// Evidence: docs/evidence-cognition.md section 5.
export const SHARPNESS_BUCKETS = [
  'night and early morning (before 9)',
  'morning (9–12)',
  'early afternoon (12–15)',
  'late afternoon (15–18)',
  'evening (18+)',
] as const

export type SharpnessBucket = (typeof SHARPNESS_BUCKETS)[number]

export interface SharpnessSummary {
  bucket: SharpnessBucket
  count: number
  // null when no session in this bucket was rated.
  mean: number | null
}

// Upper edge (exclusive) of each bucket except the last, in local hours.
const EDGES = [9, 12, 15, 18] as const

function bucketIndex(hour: number): number {
  const i = EDGES.findIndex((edge) => hour < edge)
  return i === -1 ? EDGES.length : i
}

// A rating is a whole number from 1 to 5. Anything else (a missing field on an event saved before the
// rating existed, a hand-edited value) is treated as not rated rather than skewing the mean.
function validRating(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5
}

// getHour maps a session's start time to its local hour (0-23); the caller owns the time zone, so this
// stays pure. The start hour is used, not the end, because that is when the person sat down to work.
export function sharpnessByTimeOfDay(
  events: readonly LogEvent[],
  getHour: (t: number) => number,
): SharpnessSummary[] {
  const sums = SHARPNESS_BUCKETS.map(() => ({ count: 0, total: 0 }))
  for (const e of events) {
    if (e.type !== 'focus' || !validRating(e.sharpness)) continue
    const hour = getHour(e.t)
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue
    const slot = sums[bucketIndex(hour)]
    if (!slot) continue
    slot.count++
    slot.total += e.sharpness
  }
  return SHARPNESS_BUCKETS.map((bucket, i) => {
    const { count, total } = sums[i] ?? { count: 0, total: 0 }
    return { bucket, count, mean: count === 0 ? null : total / count }
  })
}

export function ratedSessionCount(summary: readonly SharpnessSummary[]): number {
  return summary.reduce((n, b) => n + b.count, 0)
}
