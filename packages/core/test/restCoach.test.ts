import { describe, expect, test } from 'bun:test'
import * as core from '../src/index'
import { RestCoach } from '../src/legacy/restCoach'

test('the active core entry point does not expose the retired workout coach', () => {
  expect('RestCoach' in core).toBe(false)
})

const floors = { strength: 120, hypertrophy: 90, hypertrophyIsolation: 60, endurance: 45 }
const S = 1000
function coach(goal: 'strength' | 'hypertrophy' | 'endurance' = 'strength') {
  const c = new RestCoach(() => floors)
  c.goal = goal
  c.compound = true
  return c
}
// feed one reading per second from a to b (seconds) using f(s)
function feed(c: RestCoach, a: number, b: number, f: (s: number) => number, contact?: boolean) {
  for (let s = a; s < b; s++) c.push(s * S, Math.round(f(s)), contact)
}
// a set from 30 s to 70 s: HR climbs 90 → 150
const climb = (s: number) => (s < 30 ? 90 : 90 + Math.min(60, (s - 30) * 1.5))

describe('RestCoach floors', () => {
  test('floor by goal', () => {
    expect(coach('strength').floorSec()).toBe(120)
    expect(coach('endurance').floorSec()).toBe(45)
    const h = coach('hypertrophy')
    expect(h.floorSec()).toBe(90)
    h.compound = false
    expect(h.floorSec()).toBe(60)
  })
  test('without HR: counting before floor, ready at floor', () => {
    const c = coach()
    c.startSet(0)
    c.endSet(40 * S)
    expect(c.view(40 * S + 119 * S).advice).toBe('counting')
    expect(c.view(40 * S + 120 * S).advice).toBe('ready')
  })
})

describe('RestCoach HR advice', () => {
  test('HR recovered → ready at floor, never before', () => {
    const c = coach()
    feed(c, 0, 30, climb)
    c.startSet(30 * S)
    feed(c, 30, 70, climb)
    c.endSet(70 * S)
    feed(c, 70, 200, (s) => 100 + 50 * Math.exp(-(s - 70) / 20))
    expect(c.view(150 * S).advice).toBe('counting')
    expect(c.view(190 * S).advice).toBe('ready')
    const v = c.view(190 * S)
    expect(v.preSetBpm).toBe(90)
    expect(v.peakBpm).toBeGreaterThanOrEqual(148)
  })
  test('HR still high → hr-high at floor, ready at cap', () => {
    const c = coach()
    feed(c, 0, 30, climb)
    c.startSet(30 * S)
    feed(c, 30, 70, climb)
    c.endSet(70 * S)
    feed(c, 70, 380, (s) => 140 + (s % 2))
    expect(c.view(190 * S).advice).toBe('hr-high')
    expect(c.view(370 * S).advice).toBe('ready')
  })
  test('plateau close to pre-set counts as settled', () => {
    const c = coach()
    feed(c, 0, 30, climb)
    c.startSet(30 * S)
    feed(c, 30, 70, climb)
    c.endSet(70 * S)
    feed(c, 70, 200, (s) => (s < 100 ? 150 - (s - 70) * 1.3 : 104))
    expect(c.view(190 * S).advice).toBe('ready')
  })
  test('contact lost → hr-unreliable after floor', () => {
    const c = coach()
    feed(c, 0, 30, climb)
    c.startSet(30 * S)
    feed(c, 30, 70, climb)
    c.endSet(70 * S)
    feed(c, 70, 200, () => 140, false)
    expect(c.view(190 * S).advice).toBe('hr-unreliable')
  })
  test('artifact jump → hr-unreliable', () => {
    const c = coach()
    feed(c, 0, 30, climb)
    c.startSet(30 * S)
    feed(c, 30, 70, climb)
    c.endSet(70 * S)
    feed(c, 70, 200, (s) => (s === 100 ? 175 : 140))
    expect(c.view(190 * S).advice).toBe('hr-unreliable')
  })
  test('HR cues off → ready at floor regardless', () => {
    const c = new RestCoach(() => floors, { hrCues: () => false })
    c.goal = 'strength'
    feed(c, 0, 30, climb)
    c.startSet(30 * S)
    feed(c, 30, 70, climb)
    c.endSet(70 * S)
    feed(c, 70, 200, () => 145)
    expect(c.view(190 * S).advice).toBe('ready')
  })
  test('stale HR (none in last 10 s) → ready', () => {
    const c = coach()
    feed(c, 0, 30, climb)
    c.startSet(30 * S)
    feed(c, 30, 70, climb)
    c.endSet(70 * S)
    feed(c, 70, 100, () => 145)
    expect(c.view(190 * S).advice).toBe('ready')
  })
})

describe('RestCoach set-end suggestion', () => {
  const setThenDrop = (s: number) => (s < 30 ? 90 : s < 70 ? climb(s) : 150 - (s - 70) * 1.2)
  test('suggests after HR falls ≥8 from in-set peak and keeps falling', () => {
    const c = coach()
    feed(c, 0, 30, setThenDrop)
    c.startSet(30 * S)
    feed(c, 30, 75, setThenDrop)
    expect(c.view(75 * S).suggestRest).toBe(false)
    feed(c, 75, 85, setThenDrop)
    expect(c.view(85 * S).suggestRest).toBe(true)
  })
  test('accepting backdates rest start to the peak', () => {
    const c = coach()
    feed(c, 0, 30, setThenDrop)
    c.startSet(30 * S)
    feed(c, 30, 85, setThenDrop)
    c.acceptSuggestion(85 * S)
    const v = c.view(85 * S)
    expect(v.phase).toBe('rest')
    expect(v.elapsedMs).toBeGreaterThanOrEqual(10 * S)
    expect(v.elapsedMs).toBeLessThanOrEqual(20 * S)
    expect(c.records[0]?.suggested).toBe(true)
  })
  test('no suggestion in the first 20 s of a set', () => {
    const c = coach()
    feed(c, 0, 30, () => 90)
    c.startSet(30 * S)
    feed(c, 30, 49, (s) => (s < 40 ? 90 + (s - 30) * 6 : 150 - (s - 40) * 3))
    expect(c.view(49 * S).suggestRest).toBe(false)
  })
  test('dismissed suggestion does not return in the same set', () => {
    const c = coach()
    feed(c, 0, 30, setThenDrop)
    c.startSet(30 * S)
    feed(c, 30, 85, setThenDrop)
    c.dismissSuggestion()
    feed(c, 85, 100, setThenDrop)
    expect(c.view(100 * S).suggestRest).toBe(false)
  })
  test('suggestion disabled by setting', () => {
    const c = new RestCoach(() => floors, { suggest: () => false })
    c.goal = 'strength'
    feed(c, 0, 30, setThenDrop)
    c.startSet(30 * S)
    feed(c, 30, 85, setThenDrop)
    expect(c.view(85 * S).suggestRest).toBe(false)
  })
})

describe('RestCoach records', () => {
  test('two sets produce two records with rest closed by next set', () => {
    const c = coach()
    c.startSet(0)
    c.endSet(40 * S)
    c.startSet(200 * S)
    c.endSet(240 * S)
    const r = c.finish(300 * S)
    expect(r.length).toBe(2)
    expect(r[0]).toMatchObject({ n: 1, setStart: 0, setEnd: 40 * S, restEnd: 200 * S, adviceAtEnd: 'ready' })
    expect(r[1]).toMatchObject({ n: 2, setEnd: 240 * S, restEnd: 300 * S })
    expect(c.view(300 * S).phase).toBe('done')
  })
  test('illegal transitions are ignored', () => {
    const c = coach()
    c.endSet(10 * S)
    expect(c.view(10 * S).phase).toBe('idle')
    c.startSet(0)
    c.startSet(5 * S)
    expect(c.records.length).toBe(1)
  })
})

describe('RestCoach edge cases', () => {
  const setThenDrop = (s: number) => (s < 30 ? 90 : s < 70 ? climb(s) : 150 - (s - 70) * 1.2)
  const restAfterSet = (c: RestCoach) => {
    feed(c, 0, 30, climb)
    c.startSet(30 * S)
    feed(c, 30, 70, climb)
    c.endSet(70 * S)
  }

  test('suggestion latches through a later rise', () => {
    const c = coach()
    feed(c, 0, 30, setThenDrop)
    c.startSet(30 * S)
    feed(c, 30, 85, setThenDrop)
    expect(c.view(85 * S).suggestRest).toBe(true)
    feed(c, 85, 100, (s) => 135 + (s - 85) * 3)
    expect(c.view(100 * S).suggestRest).toBe(true)
  })
  test('10 Hz 10-minute set view stays well inside the UI tick and scales linearly', () => {
    const timeView = (n: number) => {
      const c = coach()
      c.startSet(0)
      for (let i = 0; i < n; i++) c.push(i * 100, 120 + (i % 37))
      const t0 = performance.now()
      c.view(n * 100)
      return performance.now() - t0
    }
    const small = Math.max(timeView(600), 0.5)
    const big = timeView(6000)
    expect(big).toBeLessThan(100)
    expect(big / small).toBeLessThan(30)
  })
  test('no pre-set baseline -> ready after floor, not hr-high', () => {
    const c = coach()
    c.startSet(30 * S)
    feed(c, 30, 70, climb)
    c.endSet(70 * S)
    feed(c, 70, 200, () => 140)
    expect(c.view(190 * S).preSetBpm).toBeNull()
    expect(c.view(190 * S).advice).toBe('ready')
  })
  test('out-of-order readings are ignored', () => {
    const c = coach()
    c.push(10 * S, 100)
    c.push(5 * S, 200)
    expect(c.view(10 * S).bpm).toBe(100)
  })
  test('finish during a set closes it without a rest', () => {
    const c = coach()
    c.startSet(0)
    const r = c.finish(30 * S)
    expect(r[0]).toMatchObject({ setEnd: 30 * S, restEnd: null })
    expect(c.view(30 * S).phase).toBe('done')
  })
  test('finish returns a copy', () => {
    const c = coach()
    c.startSet(0)
    const r = c.finish(10 * S)
    r.pop()
    expect(c.records.length).toBe(1)
  })
  test('artifact jump of 25 is fine, 26 is unreliable', () => {
    for (const [jump, want] of [
      [25, 'hr-high'],
      [26, 'hr-unreliable'],
    ] as const) {
      const c = coach()
      restAfterSet(c)
      feed(c, 70, 200, (s) => (s === 100 ? 140 + jump : 140))
      expect(c.view(190 * S).advice).toBe(want)
    }
  })
  test('HR exactly 10 s old is stale, 9 s old is fresh', () => {
    const a = coach()
    restAfterSet(a)
    feed(a, 70, 181, () => 140)
    expect(a.view(190 * S).advice).toBe('ready')
    const b = coach()
    restAfterSet(b)
    feed(b, 70, 182, () => 140)
    expect(b.view(190 * S).advice).toBe('hr-high')
  })

  // The 5-second median at `now` is empty when the strap pauses for 5-10 s, so recovery is judged at the
  // newest reading; otherwise a recovered rest would read "take more time" until the reading went stale.
  test('a recovered rest reads ready while the newest reading is 5-10 s old', () => {
    const c = coach()
    restAfterSet(c)
    feed(c, 70, 183, () => 92)
    const v = c.view(191 * S)
    expect(v.advice).toBe('ready')
    expect(v.recoveredPct).not.toBeNull()
    // The saved record agrees with what the screen showed.
    const rec = c.finish(191 * S)[0]
    expect(rec?.adviceAtEnd).toBe('ready')
    expect(rec?.endRestBpm).toBe(92)
  })
})

describe('RestCoach reset', () => {
  test('a second workout can start after finish', () => {
    const c = coach()
    c.startSet(0)
    c.endSet(30 * S)
    c.finish(40 * S)
    c.startSet(50 * S)
    expect(c.view(50 * S).phase).toBe('done')
    c.reset()
    expect(c.records.length).toBe(0)
    expect(c.view(60 * S).phase).toBe('idle')
    c.startSet(60 * S)
    const v = c.view(70 * S)
    expect(v.phase).toBe('set')
    expect(v.setNumber).toBe(1)
    expect(v.suggestRest).toBe(false)
  })
})

describe('RestCoach bad input', () => {
  test('ignores non-finite bpm and t', () => {
    const c = coach()
    c.push(1000, 70)
    c.push(2000, Number.NaN)
    c.push(Number.NaN, 80)
    c.push(Number.POSITIVE_INFINITY, 80)
    expect(c.view(2000).bpm).toBe(70)
  })
})
