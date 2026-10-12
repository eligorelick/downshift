import { describe, expect, test } from 'bun:test'
import type { LogEvent } from '../src/log'
import { SHARPNESS_BUCKETS, ratedSessionCount, sharpnessByTimeOfDay } from '../src/sharpness'

// The test passes the start hour in as t, so no time zone is involved.
const hourOf = (t: number): number => t

function focus(startHour: number, sharpness: number | null): LogEvent {
  return {
    type: 'focus',
    t: startHour,
    preset: 'work',
    blocks: 1,
    focusMs: 1_500_000,
    // Deliberately a different "hour" from the start: the bucket must come from the start.
    endedAt: startHour + 5,
    sharpness,
  }
}

const byName = (events: LogEvent[]) =>
  Object.fromEntries(sharpnessByTimeOfDay(events, hourOf).map((b) => [b.bucket, b]))

describe('sharpnessByTimeOfDay', () => {
  test('always lists the five buckets in day order; empty input has no ratings', () => {
    const out = sharpnessByTimeOfDay([], hourOf)
    expect(out.map((b) => b.bucket)).toEqual([
      'night and early morning (before 9)',
      'morning (9–12)',
      'early afternoon (12–15)',
      'late afternoon (15–18)',
      'evening (18+)',
    ])
    expect(out.map((b) => b.bucket)).toEqual([...SHARPNESS_BUCKETS])
    for (const b of out) expect(b).toMatchObject({ count: 0, mean: null })
  })

  test('bucket edges: each boundary hour belongs to the later bucket', () => {
    const cases: Array<[number, string]> = [
      [0, 'night and early morning (before 9)'],
      [8, 'night and early morning (before 9)'],
      [9, 'morning (9–12)'],
      [11, 'morning (9–12)'],
      [12, 'early afternoon (12–15)'],
      [14, 'early afternoon (12–15)'],
      [15, 'late afternoon (15–18)'],
      [17, 'late afternoon (15–18)'],
      [18, 'evening (18+)'],
      [23, 'evening (18+)'],
    ]
    for (const [hour, bucket] of cases) {
      const out = byName([focus(hour, 3)])
      expect(out[bucket]?.count).toBe(1)
      expect(sharpnessByTimeOfDay([focus(hour, 3)], hourOf).reduce((n, b) => n + b.count, 0)).toBe(1)
    }
  })

  test('mean and count per bucket', () => {
    const out = byName([focus(9, 4), focus(10, 5), focus(11, 3), focus(19, 2)])
    expect(out['morning (9–12)']).toEqual({ bucket: 'morning (9–12)', count: 3, mean: 4 })
    expect(out['evening (18+)']).toEqual({ bucket: 'evening (18+)', count: 1, mean: 2 })
    expect(out['night and early morning (before 9)']?.mean).toBeNull()
  })

  test('ignores sessions with no rating, including old events with the field missing', () => {
    const old = { ...focus(9, 3) } as Partial<Extract<LogEvent, { type: 'focus' }>>
    old.sharpness = undefined
    const out = byName([focus(9, null), old as LogEvent, focus(9, 4)])
    expect(out['morning (9–12)']).toMatchObject({ count: 1, mean: 4 })
  })

  test('ignores other event types and ratings outside 1 to 5', () => {
    const brk: LogEvent = {
      type: 'break',
      t: 9,
      minutes: 5,
      long: false,
      feeling: null,
      suggestion: 'rest',
    }
    const out = byName([brk, focus(9, 0), focus(9, 6), focus(9, Number.NaN), focus(9, 2.5), focus(9, 5)])
    expect(out['morning (9–12)']).toMatchObject({ count: 1, mean: 5 })
  })

  test('ignores a session whose start hour is not a valid hour', () => {
    const e = focus(9, 4)
    expect(sharpnessByTimeOfDay([e], () => Number.NaN).every((b) => b.count === 0)).toBe(true)
    expect(sharpnessByTimeOfDay([e], () => 24).every((b) => b.count === 0)).toBe(true)
  })

  test('does not mutate the events', () => {
    const events = [focus(9, 4)]
    const copy = structuredClone(events)
    sharpnessByTimeOfDay(events, hourOf)
    expect(events).toEqual(copy)
  })
})

describe('ratedSessionCount', () => {
  test('counts rated sessions only', () => {
    const out = sharpnessByTimeOfDay([focus(9, 4), focus(13, 2), focus(13, null), focus(20, 5)], hourOf)
    expect(ratedSessionCount(out)).toBe(3)
    expect(ratedSessionCount(sharpnessByTimeOfDay([], hourOf))).toBe(0)
  })
})

describe('with a real local-hour function', () => {
  // The app passes new Date(t).getHours(); built from local parts so the test holds in any time zone.
  const local = (t: number): number => new Date(t).getHours()
  const at = (h: number, m: number): LogEvent => focus(new Date(2026, 9, 10, h, m).getTime(), 4)

  test('a session is bucketed by the local hour it started in', () => {
    const out = Object.fromEntries(
      sharpnessByTimeOfDay([at(8, 59), at(9, 0), at(14, 30), at(17, 59), at(18, 0), at(0, 15)], local).map(
        (b) => [b.bucket, b.count],
      ),
    )
    expect(out).toEqual({
      'night and early morning (before 9)': 2,
      'morning (9–12)': 1,
      'early afternoon (12–15)': 1,
      'late afternoon (15–18)': 1,
      'evening (18+)': 1,
    })
  })
})
