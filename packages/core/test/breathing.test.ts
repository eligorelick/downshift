import { describe, expect, test } from 'bun:test'
import { PATTERNS, TECHNIQUE_GUIDE, breathAt, findPattern, getPattern } from '../src/breathing'
import { defaultSettings } from '../src/settings'

const def = getPattern(defaultSettings().pattern)

describe('patterns', () => {
  test('default pattern is 4 in, 6 out with no holds', () => {
    expect(def.key).toBe('slow46')
    expect(def.steps.map((s) => s.seconds)).toEqual([4, 6])
  })

  test('cycle lengths are 10, 10, 10, 16', () => {
    expect(PATTERNS.map((p) => p.key)).toEqual(['slow46', 'slow55', 'sigh', 'box'])
    expect(PATTERNS.map((p) => p.cycleSeconds)).toEqual([10, 10, 10, 16])
  })

  test('default and 5/5 are six breaths a minute', () => {
    expect(60 / def.cycleSeconds).toBeCloseTo(6, 9)
    expect(60 / getPattern('slow55').cycleSeconds).toBeCloseTo(6, 9)
  })

  test('default session is five minutes', () => {
    expect(defaultSettings().breathMinutes).toBe(5)
  })

  test('unknown pattern falls back to the default', () => {
    expect(getPattern('nope').key).toBe('slow46')
    expect(findPattern('nope')).toBeUndefined()
  })
})

describe('breathAt', () => {
  test('t=0 starts the inhale, lungs empty', () => {
    const ph = breathAt(def, 0)
    expect(ph.index).toBe(0)
    expect(ph.fill).toBe(0)
  })

  test('t=4 starts the exhale, lungs full', () => {
    const ph = breathAt(def, 4)
    expect(ph.index).toBe(1)
    expect(ph.fill).toBeCloseTo(1, 9)
  })

  test('t=10 is the second breath', () => {
    const ph = breathAt(def, 10)
    expect(ph.cycle).toBe(1)
    expect(ph.index).toBe(0)
  })

  test('fill is half way through the inhale', () => {
    expect(breathAt(def, 2).fill).toBeCloseTo(0.5, 9)
    expect(breathAt(def, 2).remaining).toBeCloseTo(2, 9)
  })

  test('box holds keep the lungs full, then empty', () => {
    const box = getPattern('box')
    expect(breathAt(box, 6).fill).toBeCloseTo(1, 9)
    expect(breathAt(box, 14).fill).toBeCloseTo(0, 9)
  })

  test('phase indices at box boundaries', () => {
    const box = getPattern('box')
    expect([0, 4, 8, 12, 16].map((t) => breathAt(box, t).index)).toEqual([0, 1, 2, 3, 0])
  })

  test('negative elapsed clamps to 0', () => {
    const ph = breathAt(def, -5)
    expect(ph.cycle).toBe(0)
    expect(ph.index).toBe(0)
    expect(ph.fill).toBe(0)
  })

  test('every pattern returns a valid phase at every instant', () => {
    let bad = 0
    for (const p of PATTERNS) {
      for (let x = 0; x < 120; x += 0.013) {
        const ph = breathAt(p, x)
        if (ph.fill < -1e-9 || ph.fill > 1 + 1e-9) bad++
      }
    }
    expect(bad).toBe(0)
  })
})

describe('technique guide', () => {
  test('has exactly the four situations', () => {
    const got: string[] = TECHNIQUE_GUIDE.map((t) => t.situation)
    expect(got.sort()).toEqual(['before-stress', 'quick-reset', 'spike', 'tension'])
  })

  test('every advised pattern exists', () => {
    for (const t of TECHNIQUE_GUIDE) expect(findPattern(t.pattern)).toBeDefined()
  })

  test('tension advice is the 5-minute default, tagged as an association', () => {
    const t = TECHNIQUE_GUIDE.find((a) => a.situation === 'tension')
    expect(t?.pattern).toBe('slow46')
    expect(t?.minutes).toBe(5)
    expect(t?.evidence).toBe('association')
  })
})

describe('breathAt with bad input', () => {
  test('non-finite elapsed is treated as 0', () => {
    expect(breathAt(def, Number.NaN)).toEqual(breathAt(def, 0))
    expect(breathAt(def, Number.POSITIVE_INFINITY)).toEqual(breathAt(def, 0))
  })
})
