import { describe, expect, test } from 'bun:test'
import {
  budgetAllows,
  budgetSpend,
  dayKey,
  defaultSettings,
  isNewerSettings,
  normalize,
  parseSettings,
  resetPreferences,
  rollToday,
  serializeSettings,
} from '../src/settings'

const MIN = 60000

describe('settings persistence', () => {
  test('fresh and older partial settings stay silent until sound is explicitly enabled', () => {
    for (const s of [defaultSettings(), parseSettings('{"version":1}')]) {
      expect([s.mute, s.voice, s.tones, s.breakSound]).toEqual([true, false, false, false])
    }
    const saved = parseSettings('{"version":1,"mute":false,"voice":true,"tones":true,"breakSound":true}')
    expect([saved.mute, saved.voice, saved.tones, saved.breakSound]).toEqual([false, true, true, true])
  })

  test('voice choice and companion timing survive a version-one round trip', () => {
    const s = parseSettings(
      JSON.stringify({
        version: 1,
        voiceURI: 'local:voice',
        lastNudgeAt: 123,
        lastHighNudgeAt: 456,
        nudgeSnoozedUntil: 789,
      }),
    )
    expect(parseSettings(serializeSettings(s))).toMatchObject({
      voiceURI: 'local:voice',
      lastNudgeAt: 123,
      lastHighNudgeAt: 456,
      nudgeSnoozedUntil: 789,
    })
  })

  test('companion timestamps reject nonfinite, unsafe, negative, or fractional numbers', () => {
    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      const s = normalize({
        ...defaultSettings(),
        lastNudgeAt: value,
        lastHighNudgeAt: value,
        nudgeSnoozedUntil: value,
      })
      expect([s.lastNudgeAt, s.lastHighNudgeAt, s.nudgeSnoozedUntil]).toEqual([0, 0, 0])
    }
  })

  test('invalid or unbounded voice identifiers fall back to automatic local selection', () => {
    for (const voiceURI of ['x'.repeat(1025), 'bad\u0000voice', 12, null]) {
      expect(parseSettings(JSON.stringify({ version: 1, voiceURI })).voiceURI).toBe('')
    }
  })
  test('defaults round-trip', () => {
    const d = defaultSettings()
    expect(parseSettings(serializeSettings(d))).toEqual(d)
  })
  test('null and garbage give defaults', () => {
    expect(parseSettings(null)).toEqual(defaultSettings())
    expect(parseSettings('{nope')).toEqual(defaultSettings())
    expect(parseSettings('42')).toEqual(defaultSettings())
  })
  test('askSharpness defaults on and survives a round trip when switched off', () => {
    expect(defaultSettings().askSharpness).toBe(true)
    const off = { ...defaultSettings(), askSharpness: false }
    expect(parseSettings(serializeSettings(off)).askSharpness).toBe(false)
  })
  test('settings saved before askSharpness existed load with it on', () => {
    expect(parseSettings(JSON.stringify({ version: 1, nudgeDelta: 20 })).askSharpness).toBe(true)
  })
  test('a non-boolean askSharpness keeps the default', () => {
    expect(parseSettings(JSON.stringify({ version: 1, askSharpness: 'no' })).askSharpness).toBe(true)
  })
  test('wrong version keeps paired', () => {
    const json = JSON.stringify({ version: 9, nudgeDelta: 25, paired: { id: 'a', name: 'Strap' } })
    const s = parseSettings(json)
    expect(s.paired).toEqual({ id: 'a', name: 'Strap' })
    expect(s.nudgeDelta).toBe(15)
  })
  test('partial object fills missing fields from defaults', () => {
    const s = parseSettings(JSON.stringify({ version: 1, nudgeDelta: 20 }))
    expect(s.nudgeDelta).toBe(20)
    expect(s.dailyCap).toBe(3)
  })
  test('unknown enum values fall back', () => {
    const s = parseSettings(
      JSON.stringify({
        version: 1,
        pattern: 'wild',
        nudgeMode: 'study',
        goal: 'x',
        theme: 'neon',
        preset: 'x',
      }),
    )
    expect(s.pattern).toBe('slow46')
    expect(s.nudgeMode).toBe('focus')
    expect(s.goal).toBe('hypertrophy')
    expect(s.theme).toBe('system')
    expect(s.preset).toBe('school')
  })
})

describe('parse with partial or bad fields', () => {
  test('type-mismatched field keeps default', () => {
    expect(parseSettings(JSON.stringify({ version: 1, nudgeDelta: 'x' })).nudgeDelta).toBe(15)
  })
  test('malformed paired becomes null', () => {
    expect(parseSettings(JSON.stringify({ version: 1, paired: { id: 5 } })).paired).toBeNull()
  })
  test('nested partial merge keeps other defaults', () => {
    const s = parseSettings(JSON.stringify({ version: 1, blockMin: { school: 30 } }))
    expect(s.blockMin).toEqual({ school: 30, work: 45 })
  })
})

describe('normalize', () => {
  test('negative counters clamp to zero', () => {
    const s = defaultSettings()
    s.promptCount = -2
    s.today = { key: 1, focusBlocks: -1, breaths: -1, focusMs: -1, sets: -1 }
    const n = normalize(s)
    expect(n.promptCount).toBe(0)
    expect(n.today).toEqual({ key: 1, focusBlocks: 0, breaths: 0, focusMs: 0, sets: 0 })
  })
  const low = () => {
    const s = defaultSettings()
    s.nudgeDelta = 0
    s.nudgeMinutes = 0
    s.waitMin = 0
    s.dailyCap = 0
    s.highLimit = 0
    s.blockMin = { school: 0, work: 0 }
    s.restFloorSec = { strength: 0, hypertrophy: 0, hypertrophyIsolation: 0, endurance: 0 }
    s.volume = -5
    return s
  }
  const high = () => {
    const s = defaultSettings()
    s.nudgeDelta = 999
    s.nudgeMinutes = 999
    s.waitMin = 999
    s.dailyCap = 999
    s.highLimit = 999
    s.blockMin = { school: 999, work: 999 }
    s.restFloorSec = { strength: 999, hypertrophy: 999, hypertrophyIsolation: 999, endurance: 999 }
    s.volume = 500
    return s
  }
  test('lower bounds', () => {
    const s = normalize(low())
    expect([s.nudgeDelta, s.nudgeMinutes, s.waitMin, s.dailyCap, s.highLimit]).toEqual([10, 3, 30, 1, 110])
    expect(s.blockMin).toEqual({ school: 20, work: 25 })
    expect(s.restFloorSec).toEqual({ strength: 60, hypertrophy: 30, hypertrophyIsolation: 30, endurance: 15 })
    expect(s.volume).toBe(0)
  })
  test('upper bounds', () => {
    const s = normalize(high())
    expect([s.nudgeDelta, s.nudgeMinutes, s.waitMin, s.dailyCap, s.highLimit]).toEqual([30, 10, 240, 6, 170])
    expect(s.blockMin).toEqual({ school: 50, work: 60 })
    expect(s.restFloorSec).toEqual({
      strength: 300,
      hypertrophy: 180,
      hypertrophyIsolation: 180,
      endurance: 120,
    })
    expect(s.volume).toBe(100)
  })
  test('breathMinutes snaps to 2 or 5', () => {
    const s = defaultSettings()
    expect(normalize({ ...s, breathMinutes: 3 as 2 }).breathMinutes).toBe(2)
    expect(normalize({ ...s, breathMinutes: 4 as 5 }).breathMinutes).toBe(5)
  })
  test('askSharpness that is not a boolean falls back to the default', () => {
    const s = { ...defaultSettings(), askSharpness: 0 as unknown as boolean }
    expect(normalize(s).askSharpness).toBe(true)
    expect(normalize({ ...defaultSettings(), askSharpness: false }).askSharpness).toBe(false)
  })
  test('does not mutate input', () => {
    const s = high()
    normalize(s)
    expect(s.nudgeDelta).toBe(999)
    expect(s.blockMin.school).toBe(999)
  })
})

describe('resetPreferences', () => {
  test('keeps persisted nudge cooldowns and snooze when preferences reset', () => {
    const r = resetPreferences({
      ...defaultSettings(),
      voiceURI: 'local:voice',
      lastNudgeAt: 123,
      lastHighNudgeAt: 456,
      nudgeSnoozedUntil: 789,
    })
    expect(r).toMatchObject({ voiceURI: '', lastNudgeAt: 123, lastHighNudgeAt: 456, nudgeSnoozedUntil: 789 })
  })
  test('keeps identity and tallies', () => {
    const s = defaultSettings()
    s.paired = { id: 'a', name: 'Strap' }
    s.tutorialDone = true
    s.welcomed = true
    s.promptDay = 20261010
    s.promptCount = 2
    s.today = { key: 20261010, focusBlocks: 2, breaths: 1, focusMs: 5000, sets: 4 }
    s.nudgeDelta = 25
    s.pattern = 'box'
    const r = resetPreferences(s)
    expect(r.paired).toEqual(s.paired)
    expect(r.tutorialDone).toBe(true)
    expect(r.welcomed).toBe(true)
    expect(r.today).toEqual(s.today)
    expect(r.promptDay).toBe(20261010)
    expect(r.promptCount).toBe(2)
    expect(r.nudgeDelta).toBe(15)
    expect(r.pattern).toBe('slow46')
  })
})

describe('rollToday', () => {
  test('resets on a new key', () => {
    const s = defaultSettings()
    s.today = { key: 1, focusBlocks: 2, breaths: 3, focusMs: 4, sets: 5 }
    expect(rollToday(s, 2).today).toEqual({ key: 2, focusBlocks: 0, breaths: 0, focusMs: 0, sets: 0 })
  })
  test('keeps tally on the same key', () => {
    const s = defaultSettings()
    s.today = { key: 1, focusBlocks: 2, breaths: 3, focusMs: 4, sets: 5 }
    expect(rollToday(s, 1).today).toEqual(s.today)
  })
})

describe('dayKey', () => {
  test('yyyymmdd local', () => expect(dayKey(new Date(2026, 9, 10))).toBe(20261010))
})

describe('nudge budget', () => {
  const day = 20261010
  test('wait window', () => {
    const s = defaultSettings()
    expect(budgetAllows(s, 60 * MIN, 0, day)).toBe(true)
    expect(budgetAllows(s, 59 * MIN, 0, day)).toBe(false)
  })
  test('daily cap', () => {
    let s = defaultSettings()
    for (let i = 0; i < 3; i++) s = budgetSpend(s, day)
    expect(budgetAllows(s, 1000 * MIN, 0, day)).toBe(false)
  })
  test('new day resets the count', () => {
    let s = defaultSettings()
    for (let i = 0; i < 3; i++) s = budgetSpend(s, day)
    expect(budgetAllows(s, 1000 * MIN, 0, day + 1)).toBe(true)
    s = budgetSpend(s, day + 1)
    expect(s.promptDay).toBe(day + 1)
    expect(s.promptCount).toBe(1)
  })
  test('spend does not mutate', () => {
    const s = defaultSettings()
    budgetSpend(s, day)
    expect(s.promptCount).toBe(0)
  })
})

describe('vibrate', () => {
  test('defaults on, survives a round trip, and an old file without it gets the default', () => {
    expect(defaultSettings().vibrate).toBe(true)
    const off = { ...defaultSettings(), vibrate: false }
    expect(parseSettings(serializeSettings(off)).vibrate).toBe(false)
    expect(parseSettings(JSON.stringify({ version: 1, nudgeDelta: 20 })).vibrate).toBe(true)
  })
})

describe('newer stored version', () => {
  test('is detected, and still falls back to defaults with the strap kept', () => {
    const json = JSON.stringify({ version: 2, nudgeDelta: 25, paired: { id: 'a', name: 'S' } })
    expect(isNewerSettings(json)).toBe(true)
    expect(parseSettings(json).nudgeDelta).toBe(15)
    expect(parseSettings(json).paired).toEqual({ id: 'a', name: 'S' })
  })
  test('current, old, null and garbage are not newer', () => {
    expect(isNewerSettings(null)).toBe(false)
    expect(isNewerSettings('{nope')).toBe(false)
    expect(isNewerSettings(JSON.stringify({ version: 1 }))).toBe(false)
    expect(isNewerSettings(JSON.stringify({ version: 0 }))).toBe(false)
    expect(isNewerSettings(JSON.stringify({ version: '2' }))).toBe(false)
    expect(isNewerSettings('[2]')).toBe(false)
  })
})

describe('hostile JSON', () => {
  const d = defaultSettings()
  test('huge numbers (1e999 parses to Infinity) fall back to defaults', () => {
    const s = parseSettings('{"version":1,"volume":1e999,"nudgeDelta":-1e999,"dailyCap":1e999}')
    expect(s.volume).toBe(d.volume)
    expect(s.nudgeDelta).toBe(d.nudgeDelta)
    expect(s.dailyCap).toBe(d.dailyCap)
  })
  test('numbers given as strings are ignored', () => {
    const s = parseSettings(
      JSON.stringify({ version: 1, volume: '90', waitMin: '120', blockMin: { school: '30' } }),
    )
    expect(s.volume).toBe(d.volume)
    expect(s.waitMin).toBe(d.waitMin)
    expect(s.blockMin.school).toBe(d.blockMin.school)
  })
  test('nested arrays and nulls where objects or scalars belong', () => {
    const s = parseSettings(
      JSON.stringify({
        version: 1,
        blockMin: [1, 2],
        restFloorSec: null,
        today: [[]],
        volume: [50],
        theme: null,
      }),
    )
    expect(s.blockMin).toEqual(d.blockMin)
    expect(s.restFloorSec).toEqual(d.restFloorSec)
    expect(s.today).toEqual(d.today)
    expect(s.volume).toBe(d.volume)
    expect(s.theme).toBe(d.theme)
  })
  test('paired with a numeric id, an array or null is dropped', () => {
    expect(parseSettings(JSON.stringify({ version: 1, paired: { id: 5, name: 'x' } })).paired).toBeNull()
    expect(parseSettings(JSON.stringify({ version: 1, paired: [] })).paired).toBeNull()
    expect(parseSettings(JSON.stringify({ version: 1, paired: null })).paired).toBeNull()
    expect(parseSettings(JSON.stringify({ version: 2, paired: { id: 7, name: 'x' } })).paired).toBeNull()
  })
})
