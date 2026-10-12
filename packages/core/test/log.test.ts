import { describe, expect, test } from 'bun:test'
import { CSV_HEADER, type LogEvent, toCsv } from '../src/log'
import type { SetRecord } from '../src/setRecord'

const T = Date.UTC(2026, 9, 10, 12, 0, 0)
const iso = '2026-10-10T12:00:00.000Z'
const HEADER =
  'time_iso,type,kind,source,duration_s,planned_s,tense_before,tense_after,rating,feeling,answer,bpm,baseline,long,blocks,ended_iso,goal,set_n,rest_s,pre_bpm,peak_bpm,end_bpm,advice,compound,suggested,sharpness,demo'

// The one data row as {column: value}, empty cells dropped, so each test lists exactly what is filled.
function filled(e: LogEvent): Record<string, string> {
  const line = toCsv([e]).split('\r\n')[1] ?? ''
  const cols = HEADER.split(',')
  const vals = line.split(',')
  expect(vals).toHaveLength(cols.length)
  const out: Record<string, string> = {}
  cols.forEach((c, i) => {
    if (vals[i] !== '') out[c] = vals[i] as string
  })
  return out
}

const record: SetRecord = {
  n: 3,
  goal: 'hypertrophy',
  compound: true,
  setStart: T,
  setEnd: T + 40000,
  restEnd: T + 40000 + 95450,
  preSetBpm: 90,
  peakBpm: 150,
  endRestBpm: 110,
  adviceAtEnd: 'ready',
  suggested: false,
}

describe('toCsv', () => {
  test('header, and an empty list gives the header only', () => {
    expect(CSV_HEADER).toBe(HEADER)
    expect(toCsv([])).toBe(`${HEADER}\r\n`)
  })

  test('breathe row', () => {
    expect(
      filled({
        type: 'breathe',
        t: T,
        pattern: 'slow46',
        plannedSec: 300,
        doneSec: 280,
        tenseBefore: 7,
        tenseAfter: 3,
        source: 'nudge',
      }),
    ).toEqual({
      time_iso: iso,
      type: 'breathe',
      kind: 'slow46',
      source: 'nudge',
      duration_s: '280',
      planned_s: '300',
      tense_before: '7',
      tense_after: '3',
    })
  })

  test('nudge row', () => {
    expect(
      filled({ type: 'nudge', t: T, due: 'tense', baseline: 70, bpm: 88, answer: 'breathe', rating: 4 }),
    ).toEqual({
      time_iso: iso,
      type: 'nudge',
      kind: 'tense',
      rating: '4',
      answer: 'breathe',
      bpm: '88',
      baseline: '70',
    })
  })

  test('focus row', () => {
    expect(
      filled({
        type: 'focus',
        t: T,
        preset: 'work',
        blocks: 2,
        focusMs: 5400000,
        endedAt: T + 5400000,
        sharpness: 4,
      }),
    ).toEqual({
      time_iso: iso,
      type: 'focus',
      kind: 'work',
      duration_s: '5400',
      blocks: '2',
      ended_iso: '2026-10-10T13:30:00.000Z',
      sharpness: '4',
    })
  })

  test('focus row with no sharpness rating leaves the cell empty', () => {
    const f: LogEvent = {
      type: 'focus',
      t: T,
      preset: 'work',
      blocks: 1,
      focusMs: 60000,
      endedAt: T + 60000,
      sharpness: null,
    }
    expect(filled(f)).not.toHaveProperty('sharpness')
    // Events saved before the rating existed have no field at all; they export the same way.
    const { sharpness: _omitted, ...old } = f
    expect(filled(old as LogEvent)).not.toHaveProperty('sharpness')
  })

  test('a break with no suggestion leaves kind empty', () => {
    const row = filled({ type: 'break', t: T, minutes: 5, long: false, feeling: null, suggestion: null })
    expect(row).not.toHaveProperty('kind')
    expect(row.type).toBe('break')
  })

  test('break row', () => {
    expect(
      filled({ type: 'break', t: T, minutes: 5, long: true, feeling: 'tired', suggestion: 'move' }),
    ).toEqual({
      time_iso: iso,
      type: 'break',
      kind: 'move',
      duration_s: '300',
      planned_s: '300',
      feeling: 'tired',
      long: '1',
    })
  })

  test('a break cut short logs its real length against the planned one', () => {
    const row = filled({
      type: 'break',
      t: T,
      minutes: 5,
      doneSec: 42,
      long: false,
      feeling: null,
      suggestion: null,
    })
    expect(row.duration_s).toBe('42')
    expect(row.planned_s).toBe('300')
  })

  test('set row', () => {
    expect(filled({ type: 'set', t: T, record })).toEqual({
      time_iso: iso,
      type: 'set',
      duration_s: '40',
      goal: 'hypertrophy',
      set_n: '3',
      rest_s: '95.5',
      pre_bpm: '90',
      peak_bpm: '150',
      end_bpm: '110',
      advice: 'ready',
      compound: '1',
      suggested: '0',
    })
  })

  test('set row with no rest end or heart rate leaves those cells empty; flags are 0', () => {
    const r = {
      ...record,
      compound: false,
      suggested: true,
      restEnd: null,
      preSetBpm: null,
      peakBpm: null,
      endRestBpm: null,
      adviceAtEnd: null,
    }
    expect(filled({ type: 'set', t: T, record: r })).toEqual({
      time_iso: iso,
      type: 'set',
      duration_s: '40',
      goal: 'hypertrophy',
      set_n: '3',
      compound: '0',
      suggested: '1',
    })
  })

  test('quotes and escapes commas, quotes and line breaks', () => {
    const odd = 'a,"b"\nc'
    // Not a real preset: the cast lets the test push awkward characters through the kind column.
    const r = toCsv([
      {
        type: 'focus',
        t: T,
        preset: odd as 'work',
        blocks: 1,
        focusMs: 1000,
        endedAt: T,
        sharpness: null,
      },
    ])
    expect(r).toContain(',"a,""b""\nc",,1,')
  })

  test('one CRLF-terminated line per event', () => {
    const e: LogEvent = { type: 'break', t: T, minutes: 5, long: false, feeling: null, suggestion: 'rest' }
    const out = toCsv([e, e])
    expect(out.split('\r\n')).toHaveLength(4)
    expect(out.endsWith('\r\n')).toBe(true)
  })
})

describe('duration rounding', () => {
  test('set and focus durations are rounded to 1 dp', () => {
    expect(filled({ type: 'set', t: T, record: { ...record, setEnd: T + 40123 } }).duration_s).toBe('40.1')
    const f: LogEvent = {
      type: 'focus',
      t: T,
      preset: 'work',
      blocks: 1,
      focusMs: 1234567,
      endedAt: T,
      sharpness: null,
    }
    expect(filled(f).duration_s).toBe('1234.6')
  })
})

describe('toCsv with a bad time', () => {
  test('skips events whose time is not finite instead of throwing', () => {
    const bad: LogEvent = {
      type: 'focus',
      t: Number.NaN,
      preset: 'school',
      blocks: 1,
      focusMs: 1000,
      endedAt: T,
      sharpness: null,
    }
    const good: LogEvent = { ...bad, t: T }
    const lines = toCsv([bad, good]).split('\r\n')
    expect(lines.length).toBe(3)
    expect(lines[1]?.startsWith(iso)).toBe(true)
  })
  test('a non-finite endedAt does not throw', () => {
    const e: LogEvent = {
      type: 'focus',
      t: T,
      preset: 'school',
      blocks: 1,
      focusMs: 1000,
      endedAt: Number.NaN,
      sharpness: null,
    }
    expect(() => toCsv([e])).not.toThrow()
  })

  test('a finite time outside the date range is skipped, and a bad endedAt is blanked, without throwing', () => {
    const far: LogEvent = {
      type: 'focus',
      t: 1e16,
      preset: 'school',
      blocks: 1,
      focusMs: 1000,
      endedAt: 1e16,
      sharpness: null,
    }
    const ok: LogEvent = { ...far, t: T, endedAt: 1e16 }
    expect(() => toCsv([far, ok])).not.toThrow()
    const lines = toCsv([far, ok]).trimEnd().split('\r\n')
    expect(lines.length).toBe(2)
    const row = lines[1]?.split(',') ?? []
    expect(row[0]).toBe(iso)
    expect(row[CSV_HEADER.split(',').indexOf('ended_iso')]).toBe('')
  })
})

describe('demo heart rate', () => {
  test('nudge and set rows from the demo carry demo=1; others leave it blank', () => {
    const nudge: LogEvent = {
      type: 'nudge',
      t: T,
      due: 'tense',
      baseline: 68,
      bpm: 88,
      answer: 'fine',
      rating: null,
      demo: true,
    }
    expect(filled(nudge).demo).toBe('1')
    expect(filled({ ...nudge, demo: undefined })).not.toHaveProperty('demo')
    const set: LogEvent = { type: 'set', t: T, record, demo: true }
    expect(filled(set).demo).toBe('1')
    expect(filled({ ...set, demo: undefined })).not.toHaveProperty('demo')
    // Rows that hold no heart rate never carry the column.
    const brk: LogEvent = { type: 'break', t: T, minutes: 5, long: false, feeling: null, suggestion: null }
    expect(filled(brk)).not.toHaveProperty('demo')
  })
})
