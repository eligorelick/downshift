import { describe, expect, test } from 'bun:test'
import { SimulatedSource } from '../src/simulated'
import type { HeartRateReading } from '../src/types'

function collect(src: SimulatedSource): HeartRateReading[] {
  const out: HeartRateReading[] = []
  src.onReading((r) => out.push(r))
  return out
}

describe('SimulatedSource', () => {
  test('workout sets peak above 140 and recover below 100 after 90 s of rest', () => {
    const src = new SimulatedSource({ scenario: 'workout-sets', now: () => 0 })
    const got = collect(src)
    for (let s = 0; s <= 40; s++) src.step(s * 1000)
    expect(Math.max(...got.map((r) => r.bpm))).toBeGreaterThan(140)
    got.length = 0
    src.step((40 + 90) * 1000)
    expect(got[0]?.bpm).toBeLessThan(100)
  })

  test('the next set starts 150 s after the first', () => {
    const src = new SimulatedSource({ scenario: 'workout-sets', now: () => 0 })
    const got = collect(src)
    src.step(150_000 + 39_000)
    expect(got[0]?.bpm).toBeGreaterThan(140)
  })

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
    const a = new SimulatedSource({ scenario: 'workout-sets', now: () => 0, seed: 7 })
    const b = new SimulatedSource({ scenario: 'workout-sets', now: () => 0, seed: 7 })
    const ga = collect(a)
    const gb = collect(b)
    for (let s = 0; s <= 100; s++) a.step(s * 1000)
    b.step(100_000)
    expect(ga[100]).toEqual(gb[0])
  })

  test('speed makes simulated time pass faster', () => {
    const src = new SimulatedSource({ scenario: 'workout-sets', now: () => 0, speed: 10 })
    const got = collect(src)
    src.step(3_900) // 39 simulated seconds, end of the first set
    expect(got[0]?.bpm).toBeGreaterThan(140)
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
