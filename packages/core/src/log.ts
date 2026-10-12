import type { Feeling } from './breakAdvice'
import type { SetRecord } from './setRecord'
import type { PatternKey, PresetKey } from './settings'

export type LogEvent =
  | {
      type: 'breathe'
      t: number
      pattern: PatternKey
      plannedSec: number
      doneSec: number
      tenseBefore: number | null
      tenseAfter: number | null
      source: 'manual' | 'nudge' | 'break'
    }
  | {
      type: 'nudge'
      t: number
      due: 'tense' | 'high'
      baseline: number
      bpm: number
      answer: 'breathe' | 'fine' | 'moving' | 'dismissed' | null
      rating: number | null
      // True when the heart rate came from the built-in demo, not a device (absent in older events).
      demo?: boolean
    }
  | {
      type: 'focus'
      t: number
      preset: PresetKey
      blocks: number
      focusMs: number
      endedAt: number
      // "How sharp did you feel?" 1 (foggy) to 5 (very sharp), asked once after the session; null if
      // skipped or switched off. Events saved before this existed have no field.
      sharpness: number | null
    }
  | {
      type: 'break'
      t: number
      // Planned length, and how long the break actually lasted (absent in events saved before it existed).
      minutes: number
      doneSec?: number
      long: boolean
      feeling: Feeling | null
      // null when nothing was suggested: the person was asked how they felt and did not answer.
      suggestion: 'breathe' | 'move' | 'rest' | null
    }
  // demo: the set's heart rate figures came from the built-in demo, not a device.
  | { type: 'set'; t: number; record: SetRecord; demo?: boolean }

const COLUMNS = [
  'time_iso',
  'type',
  'kind',
  'source',
  'duration_s',
  'planned_s',
  'tense_before',
  'tense_after',
  'rating',
  'feeling',
  'answer',
  'bpm',
  'baseline',
  'long',
  'blocks',
  'ended_iso',
  'goal',
  'set_n',
  'rest_s',
  'pre_bpm',
  'peak_bpm',
  'end_bpm',
  'advice',
  'compound',
  'suggested',
  'sharpness',
  'demo',
] as const

type Column = (typeof COLUMNS)[number]
type Cells = Partial<Record<Column, string | number | null>>

export const CSV_HEADER = COLUMNS.join(',')

// RFC 4180: quote a field that holds a comma, quote or line break, and double any quotes inside it.
function field(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function oneDp(x: number): number {
  return Math.round(x * 10) / 10
}

const flag = (b: boolean): number => (b ? 1 : 0)
// A time a Date can represent. NaN, Infinity and finite values past the Date range (about ±8.64e15 ms)
// all fail, and toISOString would throw a RangeError on them.
const datable = (t: number): boolean => !Number.isNaN(new Date(t).getTime())
// A bad time gives a blank cell instead of that RangeError.
const isoOf = (t: number): string => (datable(t) ? new Date(t).toISOString() : '')

function cells(e: LogEvent): Cells {
  switch (e.type) {
    case 'breathe':
      return {
        kind: e.pattern,
        source: e.source,
        duration_s: e.doneSec,
        planned_s: e.plannedSec,
        tense_before: e.tenseBefore,
        tense_after: e.tenseAfter,
      }
    case 'nudge':
      return {
        kind: e.due,
        rating: e.rating,
        bpm: e.bpm,
        baseline: e.baseline,
        answer: e.answer,
        demo: e.demo ? 1 : null,
      }
    case 'focus':
      return {
        kind: e.preset,
        duration_s: oneDp(e.focusMs / 1000),
        blocks: e.blocks,
        ended_iso: isoOf(e.endedAt),
        // ?? because events saved before the rating existed have no field.
        sharpness: e.sharpness ?? null,
      }
    case 'break':
      return {
        kind: e.suggestion,
        duration_s: e.doneSec ?? e.minutes * 60,
        planned_s: e.minutes * 60,
        feeling: e.feeling,
        long: flag(e.long),
      }
    case 'set': {
      const r = e.record
      return {
        duration_s: oneDp((r.setEnd - r.setStart) / 1000),
        goal: r.goal,
        set_n: r.n,
        rest_s: r.restEnd === null ? null : oneDp((r.restEnd - r.setEnd) / 1000),
        pre_bpm: r.preSetBpm,
        peak_bpm: r.peakBpm,
        end_bpm: r.endRestBpm,
        advice: r.adviceAtEnd,
        compound: flag(r.compound),
        suggested: flag(r.suggested),
        demo: e.demo ? 1 : null,
      }
    }
  }
}

export function toCsv(events: LogEvent[]): string {
  // An event with a bad time can't be dated, so it is left out rather than failing the whole export.
  const rows = events
    .filter((e) => datable(e.t))
    .map((e) => {
      const c = cells(e)
      return COLUMNS.map((col) =>
        col === 'time_iso' ? isoOf(e.t) : col === 'type' ? e.type : field(c[col]),
      ).join(',')
    })
  return [CSV_HEADER, ...rows].map((l) => `${l}\r\n`).join('')
}
