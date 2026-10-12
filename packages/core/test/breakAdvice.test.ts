import { describe, expect, test } from 'bun:test'
import { blockHrNote, minutesRaised, suggestBreak } from '../src/breakAdvice'
import { NudgeDetector } from '../src/nudge'
import { defaultSettings } from '../src/settings'

describe('suggestBreak', () => {
  test('tense gets slow breathing', () => {
    const s = suggestBreak('tense', 5)
    expect(s.kind).toBe('breathe')
    expect(s.title).toBe('Slow breathing')
    expect(s.detail).toBe('Five minutes of slow breathing, then rest your eyes.')
    expect(s.offerBreathe).toBe(true)
  })
  test('short break shortens the breathing', () => {
    const s = suggestBreak('tense', 4)
    expect(s.detail).toBe('Two minutes of slow breathing, then rest your eyes.')
    expect(s.offerBreathe).toBe(true)
  })
  test('tired gets movement, outside or a view', () => {
    const s = suggestBreak('tired', 5)
    expect(s.kind).toBe('move')
    expect(s.title).toBe('Move')
    expect(s.detail).toBe('Walk, take the stairs or stretch. Outside or with a view of greenery if you can.')
    expect(s.offerBreathe).toBe(false)
  })
  test('fine and unknown get rest away from the screen', () => {
    for (const f of ['fine', null] as const) {
      const s = suggestBreak(f, 5)
      expect(s.kind).toBe('rest')
      expect(s.title).toBe('Step away')
      expect(s.detail).toBe('Leave the screen and your phone. Look at something far away.')
      expect(s.offerBreathe).toBe(false)
    }
  })
})

describe('blockHrNote', () => {
  test('no context, or a quiet block, gives no note', () => {
    expect(blockHrNote(null)).toBeNull()
    expect(blockHrNote({ nudgedThisBlock: false, minutesRaised: 0 })).toBeNull()
    expect(blockHrNote({ nudgedThisBlock: false, minutesRaised: 2 })).toBeNull()
  })
  test('three or more raised minutes states the count and nothing about the person', () => {
    expect(blockHrNote({ nudgedThisBlock: false, minutesRaised: 3 })).toBe(
      'Your heart rate was up for 3 minutes of this block.',
    )
    expect(blockHrNote({ nudgedThisBlock: false, minutesRaised: 12 })).toBe(
      'Your heart rate was up for 12 minutes of this block.',
    )
  })
  test('a nudge alone is enough, and a single minute is singular', () => {
    expect(blockHrNote({ nudgedThisBlock: true, minutesRaised: 1 })).toBe(
      'Your heart rate was up for 1 minute of this block.',
    )
  })
  test('a nudge with no whole raised minute does not claim a count of zero', () => {
    expect(blockHrNote({ nudgedThisBlock: true, minutesRaised: 0 })).toBe(
      'Your heart rate was up enough to prompt a check-in during this block.',
    )
  })
  test('never mentions tension, stress or a feeling', () => {
    const note = blockHrNote({ nudgedThisBlock: true, minutesRaised: 8 }) ?? ''
    expect(note).not.toMatch(/tense|tension|stress|anxi|feel/i)
  })
})

describe('minutesRaised', () => {
  test('counts minutes at or above baseline + delta', () => {
    expect(minutesRaised([70, 90, 91, 70], 70, 15)).toBe(2)
    expect(minutesRaised([], 70, 15)).toBe(0)
  })
})

describe('NudgeDetector.minuteMediansSince', () => {
  test('returns closed usable minutes from t on', () => {
    const d = new NudgeDetector(defaultSettings())
    d.startMonitoring(0, 0)
    for (let s = 0; s < 10 * 60 + 1; s++) d.push(s * 1000, 70)
    expect(d.minuteMediansSince(0)).toHaveLength(10)
    expect(d.minuteMediansSince(5 * 60000)).toHaveLength(5)
    expect(d.minuteMediansSince(5 * 60000)[0]).toBe(70)
    expect(d.minuteMediansSince(60 * 60000)).toEqual([])
  })
  test('skips minutes before monitoring settled', () => {
    const d = new NudgeDetector(defaultSettings())
    d.startMonitoring(0, 3)
    for (let s = 0; s < 6 * 60 + 1; s++) d.push(s * 1000, 70)
    expect(d.minuteMediansSince(0)).toHaveLength(3)
  })
})
