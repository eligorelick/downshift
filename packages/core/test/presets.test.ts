import { describe, expect, test } from 'bun:test'
import { PRESETS } from '../src/presets'

describe('short break length', () => {
  for (const key of ['school', 'work'] as const) {
    const p = PRESETS[key]
    test(`${key}: 5 up to 25, 8 up to 50, 10 beyond`, () => {
      expect(p.shortBreakMin(20)).toBe(5)
      expect(p.shortBreakMin(25)).toBe(5)
      expect(p.shortBreakMin(26)).toBe(8)
      expect(p.shortBreakMin(45)).toBe(8)
      expect(p.shortBreakMin(50)).toBe(8)
      expect(p.shortBreakMin(55)).toBe(10)
      expect(p.shortBreakMin(60)).toBe(10)
    })
  }
  test('long break timing stays at 100 worked minutes', () => {
    expect(PRESETS.school.longAfterWorkedMin).toBe(100)
    expect(PRESETS.work.longAfterWorkedMin).toBe(100)
  })
})
