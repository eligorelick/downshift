import { describe, expect, test } from 'bun:test'
import { FocusClock } from '../src/focusClock'
import { PRESETS } from '../src/presets'
import type { PresetKey } from '../src/settings'

const min = 60000

function clockFor(key: PresetKey, blockMin: number): FocusClock {
  return new FocusClock(
    () => PRESETS[key],
    () => blockMin,
  )
}

// Runs `n` blocks back to back, taking every break in full. Returns the break lengths, "L" marking long ones.
function breaks(c: FocusClock, blockMin: number, n: number): string {
  let t = 0
  const kinds: string[] = []
  c.start(t)
  for (let i = 0; i < n; i++) {
    t += blockMin * min
    c.tick(t)
    c.beginBreak(t)
    kinds.push(c.breakMinutes + (c.breakIsLong ? 'L' : ''))
    t += c.breakMinutes * min
    c.tick(t)
    c.nextBlock(t)
  }
  return kinds.join(',')
}

describe('school focus clock (25 minute blocks)', () => {
  test('full snooze and break flow', () => {
    const c = clockFor('school', 25)
    c.start(0)
    expect(c.tick(22 * min + 59000)).toBe('none')
    expect(c.phase).toBe('work')
    expect(c.tick(23 * min)).toBe('headsUp')
    expect(c.tick(23 * min + 1000)).toBe('none')
    expect(c.tick(25 * min)).toBe('breakDue')
    expect(c.phase).toBe('breakDue')
    expect(c.breakMinutes).toBe(5)
    expect(c.breakIsLong).toBe(false)
    c.snooze(25 * min, true)
    expect(c.phase).toBe('work')
    expect(c.remaining(25 * min)).toBe(5 * min)
    expect(c.tick(29 * min)).toBe('none')
    expect(c.tick(30 * min)).toBe('breakDue')
    c.snooze(30 * min, true)
    expect(c.canSnooze).toBe(false)
    c.tick(35 * min)
    c.beginBreak(35 * min)
    expect(c.phase).toBe('break')
    expect(c.blocks).toBe(1)
    expect(c.workedMs).toBe(35 * min)
    expect(c.tick(39 * min + 59000)).toBe('none')
    expect(c.tick(40 * min)).toBe('breakOver')
    expect(c.phase).toBe('backDue')
    c.extendBreak(40 * min)
    expect(c.phase).toBe('break')
    expect(c.canExtend).toBe(false)
    expect(c.tick(45 * min)).toBe('breakOver')
    c.nextBlock(45 * min)
    expect(c.phase).toBe('work')
    expect(c.canSnooze).toBe(true)
    expect(c.blockNumber).toBe(2)
    expect(c.remaining(45 * min)).toBe(25 * min)
    expect(c.blockStartedAt()).toBe(45 * min)
  })

  test('closing the prompt does not count as a snooze', () => {
    const c = clockFor('school', 25)
    c.start(0)
    c.tick(25 * min)
    c.snooze(25 * min, false)
    expect(c.snoozes).toBe(0)
    expect(c.canSnooze).toBe(true)
  })

  test('25-minute blocks: breaks run 5, 5, 5, 20, 5', () => {
    expect(breaks(clockFor('school', 25), 25, 5)).toBe('5,5,5,20L,5')
  })

  test('50-minute blocks: breaks run 8, 20, 8', () => {
    expect(breaks(clockFor('school', 50), 50, 3)).toBe('8,20L,8')
  })

  test('a break can be taken early', () => {
    const c = clockFor('school', 25)
    c.start(0)
    c.beginBreak(10 * min)
    expect(c.phase).toBe('break')
    expect(c.workedMs).toBe(10 * min)
  })

  test('ending mid-block keeps the time worked', () => {
    const c = clockFor('school', 25)
    c.start(0)
    c.stop(12 * min)
    expect(c.phase).toBe('off')
    expect(c.workedMs).toBe(12 * min)
    expect(c.blocks).toBe(1)
  })
})

describe('work focus clock (45 minute blocks)', () => {
  test('heads-up at 43:00, break due at 45:00, short break is 8 minutes', () => {
    const c = clockFor('work', 45)
    c.start(0)
    expect(c.tick(42 * min + 59000)).toBe('none')
    expect(c.tick(43 * min)).toBe('headsUp')
    expect(c.tick(45 * min)).toBe('breakDue')
    expect(c.breakMinutes).toBe(8)
    expect(c.breakIsLong).toBe(false)
  })

  test('three blocks of 45: the third break is the long 15 minutes', () => {
    expect(breaks(clockFor('work', 45), 45, 3)).toBe('8,8,15L')
  })
})
