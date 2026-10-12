import { describe, expect, test } from 'bun:test'
import { type Due, NEVER, NudgeDetector, roundHalfEven } from '../src/nudge'
import { type Settings, defaultSettings } from '../src/settings'

interface Hit {
  s: number
  due: Due
}

// One reading a second from `from` to `to` (seconds). Returns what became due and when.
function run(d: NudgeDetector, from: number, to: number, bpm: (s: number) => number): Hit[] {
  const hits: Hit[] = []
  for (let s = from; s < to; s++) {
    const v = d.push(s * 1000, bpm(s))
    if (v.due !== 'none') hits.push({ s, due: v.due })
  }
  return hits
}

function show(hits: Hit[]): string {
  return `[${hits.map((h) => `${h.due}@${Math.floor(h.s / 60)}:${String(h.s % 60).padStart(2, '0')}`).join(',')}]`
}

const rest = (s: number) => 68 + roundHalfEven(2 * Math.sin(s / 11))
const M = 60

function settings(over: Partial<Settings> = {}): Settings {
  return { ...defaultSettings(), ...over }
}

// A detector that has watched 30 calm minutes of a study session.
function calm(cfg: Settings = settings()): NudgeDetector {
  const d = new NudgeDetector(cfg)
  d.startMonitoring(0, NudgeDetector.SETTLE_START_MIN)
  run(d, 0, 30 * M, rest)
  return d
}

describe('roundHalfEven', () => {
  test('halves go to even', () => {
    expect(roundHalfEven(0.5)).toBe(0)
    expect(roundHalfEven(1.5)).toBe(2)
    expect(roundHalfEven(2.5)).toBe(2)
    expect(roundHalfEven(-0.5) + 0).toBe(0)
    expect(roundHalfEven(-1.5)).toBe(-2)
    expect(roundHalfEven(2.4)).toBe(2)
    expect(roundHalfEven(2.6)).toBe(3)
  })
})

describe('NudgeDetector', () => {
  test('45 calm minutes: no nudge; baseline learned; threshold is baseline + 15', () => {
    const d = new NudgeDetector(settings())
    d.startMonitoring(0, NudgeDetector.SETTLE_START_MIN)
    const a = run(d, 0, 45 * M, rest)
    expect(a.length).toBe(0)
    expect(d.last.hasBaseline).toBe(true)
    expect(Math.abs(d.last.baseline - 68)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(d.last.threshold - d.last.baseline - 15)).toBeLessThan(1e-9)
  })

  test('+18 bpm held for minutes nudges exactly once, after five full minutes, with no repeat', () => {
    const d = calm()
    let a = run(d, 30 * M, 40 * M, (s) => rest(s) + Math.trunc(Math.min(18, (s - 30 * M) * 0.3)))
    expect(a.length).toBe(1)
    expect(a[0]?.due).toBe('tense')
    expect(a[0]?.s).toBeGreaterThanOrEqual(35 * M)
    expect(a[0]?.s).toBeLessThanOrEqual(36 * M + 1)
    a = run(d, 40 * M, 70 * M, (s) => rest(s) + 18)
    expect(a.length).toBe(0)
  })

  test('standing up briefly: no nudge', () => {
    const d = calm()
    const a = run(d, 30 * M, 30 * M + 30, (s) => rest(s) + (s - 30 * M < 8 ? (s - 30 * M) * 2 : 16))
    a.push(...run(d, 30 * M + 30, 40 * M, rest))
    expect(a.length).toBe(0)
  })

  test('six minutes of walking: sharp jump is treated as movement, no nudge', () => {
    const d = calm()
    const a = run(d, 30 * M, 30 * M + 30, (s) => rest(s) + 20)
    expect(d.last.holdOff).toBe(true)
    a.push(...run(d, 30 * M + 30, 36 * M, (s) => rest(s) + 20))
    a.push(...run(d, 36 * M, 45 * M, rest))
    expect(a.length).toBe(0)
  })

  test('sharp jump that stays up still nudges, later', () => {
    const d = calm()
    const a = run(d, 30 * M, 45 * M, (s) => rest(s) + 20)
    expect(a.length).toBe(1)
    expect(a[0]?.due).toBe('tense')
    expect(a[0]?.s).toBeGreaterThanOrEqual(38 * M)
    expect(a[0]?.s).toBeLessThanOrEqual(40 * M)
  })

  test('slow drift (+1 bpm every 4 min): no nudge', () => {
    const d = calm()
    const a = run(d, 30 * M, 70 * M, (s) => rest(s) + Math.trunc((s - 30 * M) / 240))
    expect(a.length).toBe(0)
  })

  test('+9 bpm for 20 minutes: no nudge', () => {
    const d = calm()
    expect(run(d, 30 * M, 50 * M, (s) => rest(s) + 9).length).toBe(0)
  })

  test('raised from the start of a session: no nudge', () => {
    const d = new NudgeDetector(settings())
    d.startMonitoring(0, NudgeDetector.SETTLE_START_MIN)
    const a = run(d, 0, 6 * M, rest)
    a.push(...run(d, 6 * M, 14 * M, (s) => rest(s) + Math.trunc(Math.min(20, (s - 6 * M) * 0.3))))
    expect(a.length).toBe(0)
  })

  test('outside a session: no nudge and no baseline', () => {
    const d = new NudgeDetector(settings())
    const a = run(d, 0, 30 * M, rest)
    a.push(...run(d, 30 * M, 45 * M, (s) => rest(s) + Math.trunc(Math.min(20, (s - 30 * M) * 0.3))))
    expect(a.length).toBe(0)
    expect(d.last.hasBaseline).toBe(false)
  })

  test('a break with movement: no nudge after, and break minutes stay out of the baseline', () => {
    const d = calm()
    d.stopMonitoring()
    const a = run(d, 30 * M, 35 * M, () => 100)
    d.startMonitoring(35 * M * 1000, NudgeDetector.SETTLE_RESUME_MIN)
    a.push(...run(d, 35 * M, 38 * M, (s) => 100 - Math.trunc((s - 35 * M) / 6)))
    a.push(...run(d, 38 * M, 50 * M, rest))
    expect(a.length).toBe(0)
    expect(Math.abs(d.last.baseline - 68)).toBeLessThanOrEqual(1.5)
  })

  test('136 bpm for ten minutes gives the high check-in, once', () => {
    const d = calm()
    const a = run(d, 30 * M, 45 * M, () => 136)
    expect(a.length).toBe(1)
    expect(a[0]?.due).toBe('high')
    expect(a[0]?.s).toBeGreaterThanOrEqual(40 * M)
    expect(a[0]?.s).toBeLessThanOrEqual(41 * M)
  })

  test('136 bpm for eight minutes: no check-in', () => {
    const d = calm()
    const a = run(d, 30 * M, 38 * M, () => 136)
    a.push(...run(d, 38 * M, 45 * M, rest))
    expect(a.filter((h) => h.due === 'high').length).toBe(0)
  })

  test('a gap in readings restarts the count', () => {
    const d = calm()
    // Three raised minutes, two whole minutes with no readings, then three more raised minutes: six raised
    // minutes in all, but never five in a row, so no nudge.
    const ramp = (from: number) => (s: number) => rest(s) + Math.trunc(Math.min(18, (s - from) * 0.3))
    const a = run(d, 30 * M, 34 * M, ramp(30 * M))
    a.push(...run(d, 36 * M, 39 * M + 5, (s) => rest(s) + 18))
    expect(a.length).toBe(0)
  })

  test('+10 for 3 minutes setting catches a smaller, shorter rise', () => {
    const d = calm(settings({ nudgeDelta: 10, nudgeMinutes: 3 }))
    const a = run(d, 30 * M, 36 * M, (s) => rest(s) + Math.trunc(Math.min(12, (s - 30 * M) * 0.3)))
    expect(a.length).toBe(1)
    expect(a[0]?.s).toBeLessThanOrEqual(35 * M)
  })

  test('0 and 300 bpm are rejected', () => {
    const d = new NudgeDetector(settings())
    expect(d.push(0, 0).valid).toBe(false)
    expect(d.push(0, 300).valid).toBe(false)
  })

  test('times before zero work (the demo seeds history this way)', () => {
    const d = new NudgeDetector(settings())
    d.startMonitoring(-40 * M * 1000, NudgeDetector.SETTLE_START_MIN)
    for (let s = -40 * M; s < 0; s++) d.push(s * 1000, rest(s))
    d.push(0, 68)
    expect(d.last.hasBaseline).toBe(true)
    expect(Math.abs(d.last.baseline - 68)).toBeLessThanOrEqual(1.5)
  })

  test('reads settings live', () => {
    const cfg = settings()
    const d = calm(cfg)
    cfg.nudgeDelta = 10
    cfg.nudgeMinutes = 3
    const a = run(d, 30 * M, 36 * M, (s) => rest(s) + Math.trunc(Math.min(12, (s - 30 * M) * 0.3)))
    expect(a.length).toBe(1)
  })

  test('reset clears everything', () => {
    const d = calm()
    d.reset()
    expect(d.monitoring).toBe(false)
    expect(d.last.valid).toBe(false)
    expect(d.last.hasBaseline).toBe(false)
  })

  test('NEVER is far in the past', () => {
    expect(NEVER).toBeLessThan(-1e14)
    expect(NudgeDetector.NEVER).toBe(NEVER)
  })
})

describe('NudgeDetector bad input', () => {
  test('non-finite bpm or t returns an empty state and changes nothing', () => {
    const d = calm()
    const before = d.last
    for (const [t, b] of [
      [31 * 60000, Number.NaN],
      [Number.NaN, 70],
      [Number.POSITIVE_INFINITY, 70],
      [31 * 60000, Number.POSITIVE_INFINITY],
    ] as const) {
      expect(d.push(t, b).valid).toBe(false)
    }
    expect(d.last).toBe(before)
  })
  test('an out-of-order reading is ignored', () => {
    const d = new NudgeDetector(settings())
    d.push(10000, 70)
    expect(d.push(5000, 70).valid).toBe(false)
    expect(d.push(11000, 70).valid).toBe(true)
  })
  test('reset clears monitoring, settle and the filling minute', () => {
    const d = new NudgeDetector(settings())
    d.startMonitoring(0, 5)
    d.push(1000, 70)
    d.reset()
    // Earlier times are accepted again after a reset, and nothing is usable until monitoring restarts.
    expect(d.push(500, 70).valid).toBe(true)
    run(d, 1, 3 * M, rest)
    expect(d.minuteMediansSince(0)).toEqual([])
  })

  test('after a reset, a session nudges exactly as it would on a fresh detector', () => {
    const rise = (s: number) => rest(s) + Math.trunc(Math.min(18, Math.max(0, s - 30 * M) * 0.3))
    const session = (d: NudgeDetector) => {
      d.startMonitoring(0, NudgeDetector.SETTLE_START_MIN)
      return run(d, 0, 40 * M, rise)
    }
    const fresh = session(new NudgeDetector(settings()))
    expect(fresh.length).toBe(1)
    // A different earlier session: a much higher resting rate that ends in a sudden jump (a movement hold-off).
    const d = new NudgeDetector(settings())
    d.startMonitoring(0, NudgeDetector.SETTLE_START_MIN)
    run(d, 0, 40 * M + 30, (s) => (s < 40 * M ? rest(s) + 30 : rest(s) + 60))
    d.reset()
    // Its baseline minutes, smoothed rate or movement hold-off left over would change when, or whether, it
    // fires. (The half-filled minute is also cleared, but startMonitoring discards it anyway.)
    expect(show(session(d))).toBe(show(fresh))
  })
})
