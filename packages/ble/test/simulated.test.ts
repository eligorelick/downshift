import { describe, expect, test } from 'bun:test'
import { legacyWorkoutBpmAt } from '../src/legacy/workoutScenario'
import { SimulatedSource } from '../src/simulated'
import type { HeartRateReading } from '../src/types'

function collect(src: SimulatedSource): HeartRateReading[] {
  const out: HeartRateReading[] = []
  src.onReading((r) => out.push(r))
  return out
}

describe('archived workout waveform', () => {
  test('rises from 90 to 150 bpm over a 40-second set', () => {
    expect(legacyWorkoutBpmAt(0)).toBe(90)
    expect(legacyWorkoutBpmAt(20)).toBe(120)
    expect(legacyWorkoutBpmAt(40)).toBe(150)
  })

  test('recovers exponentially and repeats after 150 seconds', () => {
    expect(legacyWorkoutBpmAt(60)).toBeCloseTo(90 + 60 / Math.E)
    expect(legacyWorkoutBpmAt(130)).toBeLessThan(100)
    expect(legacyWorkoutBpmAt(150)).toBe(90)
    expect(legacyWorkoutBpmAt(189)).toBe(148.5)
  })
})

describe('SimulatedSource', () => {
  test('resting stays between 60 and 76', () => {
    const src = new SimulatedSource({ scenario: 'resting', now: () => 0 })
    const got = collect(src)
    for (let s = 0; s < 600; s++) src.step(s * 1000)
    for (const r of got) {
      expect(r.bpm).toBeGreaterThanOrEqual(60)
      expect(r.bpm).toBeLessThanOrEqual(76)
    }
  })

  test('stress-rise is resting for 20 minutes, then ramps up 18 bpm over a minute', () => {
    const src = new SimulatedSource({ scenario: 'stress-rise', now: () => 0 })
    const got = collect(src)
    for (let s = 0; s < 1200; s++) src.step(s * 1000)
    expect(Math.max(...got.map((r) => r.bpm))).toBeLessThanOrEqual(76)
    got.length = 0
    src.step(1_260_000)
    expect(got[0]?.bpm).toBeGreaterThanOrEqual(83)
  })

  test('readings depend on time, not on how many times step was called', () => {
    const a = new SimulatedSource({ scenario: 'stress-rise', now: () => 0, seed: 7 })
    const b = new SimulatedSource({ scenario: 'stress-rise', now: () => 0, seed: 7 })
    const ga = collect(a)
    const gb = collect(b)
    for (let s = 0; s <= 1260; s++) a.step(s * 1000)
    b.step(1_260_000)
    expect(ga[1260]).toEqual(gb[0])
  })

  test('speed makes simulated time pass faster', () => {
    const src = new SimulatedSource({ scenario: 'stress-rise', now: () => 0, speed: 10 })
    const got = collect(src)
    // At 1230 simulated seconds the base is 68 + 9 bpm; at 1260 it is 68 + 18.
    // The seeded noise can move either rounded reading by at most 1 bpm.
    src.step(123_000)
    src.step(126_000)
    expect(got[0]?.bpm).toBeGreaterThanOrEqual(76)
    expect(got[0]?.bpm).toBeLessThanOrEqual(78)
    expect(got[1]?.bpm).toBeGreaterThanOrEqual(85)
    expect(got[1]?.bpm).toBeLessThanOrEqual(87)
  })

  test('connect emits one reading per interval, following the injected clock', async () => {
    let t = 1_000_000
    const timers: { fn: () => void; ms: number }[] = []
    const src = new SimulatedSource({
      scenario: 'resting',
      now: () => t,
      setInterval: (fn, ms) => {
        timers.push({ fn, ms })
        return timers.length
      },
      clearInterval: () => {},
    })
    const states: string[] = []
    src.onState((s) => states.push(s))
    const got = collect(src)
    await src.connect()
    expect(src.state).toBe('connected')
    expect(timers[0]?.ms).toBe(1000)
    t += 1000
    timers[0]?.fn()
    expect(got.length).toBe(1)
    expect(got[0]?.t).toBe(t)
    await src.disconnect()
    expect(src.state).toBe('disconnected')
    expect(states).toEqual(['connecting', 'connected', 'disconnected'])
  })

  test('connecting twice does not leak the interval', async () => {
    const live = new Set<number>()
    let n = 0
    const src = new SimulatedSource({
      scenario: 'resting',
      setInterval: () => {
        live.add(++n)
        return n
      },
      clearInterval: (h) => {
        live.delete(h as number)
      },
    })
    await src.connect()
    await src.connect()
    expect(live.size).toBe(1)
    await src.disconnect()
    expect(live.size).toBe(0)
  })

  test('a throwing listener does not stop the others', async () => {
    const src = new SimulatedSource({ scenario: 'resting', now: () => 0 })
    src.onReading(() => {
      throw new Error('boom')
    })
    src.onState(() => {
      throw new Error('boom')
    })
    const got = collect(src)
    await src.connect()
    src.step(1000)
    expect(got.length).toBe(1)
    expect(src.state).toBe('connected')
  })
})
