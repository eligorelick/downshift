import { describe, expect, test } from 'bun:test'
import { clock, duration, minutesPhrase } from '../src/format'

describe('clock', () => {
  test('zero', () => expect(clock(0)).toBe('0:00'))
  test('rounds to nearest second', () => expect(clock(59.6)).toBe('1:00'))
  test('minutes and seconds', () => expect(clock(125)).toBe('2:05'))
  test('negative clamps', () => expect(clock(-3)).toBe('0:00'))
})

describe('duration', () => {
  test('zero', () => expect(duration(0)).toBe('0 min'))
  test('minutes only', () => expect(duration(59 * 60000)).toBe('59 min'))
  test('hours and minutes', () => expect(duration(125 * 60000)).toBe('2 h 5 min'))
})

describe('non-finite input', () => {
  test('clock', () => {
    expect(clock(Number.NaN)).toBe('0:00')
    expect(clock(Number.POSITIVE_INFINITY)).toBe('0:00')
  })
  test('duration', () => {
    expect(duration(Number.NaN)).toBe('0 min')
    expect(duration(Number.NEGATIVE_INFINITY)).toBe('0 min')
  })
})

describe('minutesPhrase', () => {
  test('a before most numbers', () => {
    expect(minutesPhrase(5)).toBe('a 5-minute')
    expect(minutesPhrase(10)).toBe('a 10-minute')
    expect(minutesPhrase(20)).toBe('a 20-minute')
  })
  test('an where the number is said with a vowel sound', () => {
    expect(minutesPhrase(8)).toBe('an 8-minute')
    expect(minutesPhrase(11)).toBe('an 11-minute')
    expect(minutesPhrase(18)).toBe('an 18-minute')
  })
})
