import { describe, expect, test } from 'bun:test'
import { matches, signalLabel } from '../src/pairing'

describe('matches', () => {
  const paired = { id: 'abc', name: 'Polar H10 1234' }
  test('same id', () => expect(matches(paired, { id: 'abc', name: 'x' })).toBe(true))
  test('name ignoring case and whitespace', () =>
    expect(matches(paired, { id: 'zzz', name: '  polar h10 1234 ' })).toBe(true))
  test('different id and name', () => expect(matches(paired, { id: 'zzz', name: 'Other' })).toBe(false))
  test('empty names do not match', () =>
    expect(matches({ id: 'a', name: '' }, { id: 'b', name: '  ' })).toBe(false))
  test('empty ids do not match', () =>
    expect(matches({ id: '', name: 'A' }, { id: '', name: 'B' })).toBe(false))
  test('null paired', () => expect(matches(null, paired)).toBe(false))
})

describe('signalLabel', () => {
  test('-50 Strong', () => expect(signalLabel(-50)).toBe('Strong'))
  test('-60 Strong', () => expect(signalLabel(-60)).toBe('Strong'))
  test('-61 Good', () => expect(signalLabel(-61)).toBe('Good'))
  test('-75 Good', () => expect(signalLabel(-75)).toBe('Good'))
  test('-76 Weak', () => expect(signalLabel(-76)).toBe('Weak'))
})
