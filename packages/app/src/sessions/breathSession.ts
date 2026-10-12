import { type BreathStep, type LogEvent, type PatternKey, dayKey, rollToday } from '@downshift/core'
import { playTone, unlockAudio } from '../platform/alerts'
import { say } from '../platform/speech'
import { now } from '../state/clock'
import { add } from '../state/logStore'
import { getSettings, updateSettings } from '../state/settingsStore'

export type BreatheSource = 'manual' | 'nudge' | 'break'

export interface StartBreatheOptions {
  source: BreatheSource
  pattern?: PatternKey
  minutes?: 2 | 5
  tenseBefore?: number
}

// Other pages (a nudge, a break) call this; the Breathe page reads the hash and shows the ready screen.
export function startBreathe({ source, pattern, minutes, tenseBefore }: StartBreatheOptions): void {
  // `n` marks a new request, so the Breathe page starts afresh for it but not when its tab is tapped.
  const q = new URLSearchParams({ source, n: String(Date.now()) })
  if (pattern) q.set('pattern', pattern)
  if (minutes) q.set('minutes', String(minutes))
  if (tenseBefore) q.set('tense', String(tenseBefore))
  location.hash = `breathe?${q.toString()}`
}

export { unlockAudio }

export interface Session {
  startedAt: number
  pausedAt: number | null
  pausedMs: number
}

export function beginSession(t = now()): Session {
  return { startedAt: t, pausedAt: null, pausedMs: 0 }
}

export function pauseSession(s: Session, t = now()): Session {
  return s.pausedAt === null ? { ...s, pausedAt: t } : s
}

export function resumeSession(s: Session, t = now()): Session {
  return s.pausedAt === null ? s : { ...s, pausedAt: null, pausedMs: s.pausedMs + (t - s.pausedAt) }
}

// Time spent paused does not count, so the pacer stops where it was.
export function elapsedSec(s: Session, t = now()): number {
  return Math.max(0, ((s.pausedAt ?? t) - s.startedAt - s.pausedMs) / 1000)
}

// Full wording for the first three cycles, then the short word so a long session is not chatty.
export function cue(step: BreathStep, cycle: number): void {
  if (getSettings().tones) playTone(step.tone, 120, 0.2)
  say(cycle < 3 ? step.say : step.short)
}

export function summaryText(before: number | null, after: number | null): string {
  return before !== null && after !== null ? `Tension ${before} → ${after}` : 'Logged'
}

export async function saveSession(e: {
  pattern: PatternKey
  plannedSec: number
  doneSec: number
  before: number | null
  after: number | null
  source: BreatheSource
  // When the breathing began; the row is dated by it, like focus, break and set rows.
  startedAt: number
}): Promise<void> {
  if (e.doneSec <= 0) return
  const t = e.startedAt
  const ev: LogEvent = {
    type: 'breathe',
    t,
    pattern: e.pattern,
    plannedSec: e.plannedSec,
    doneSec: e.doneSec,
    tenseBefore: e.before,
    tenseAfter: e.after,
    source: e.source,
  }
  updateSettings((s) => {
    // Counted on the day it is saved, like the other tallies; only the History row is dated by its start.
    const r = rollToday(s, dayKey(new Date(now())))
    return { ...r, today: { ...r.today, breaths: r.today.breaths + 1 } }
  })
  await add(ev)
}

// True only while the pacer runs. The setup and "how tense now" screens do not count, so a prompt (such as
// the high heart rate check-in) is not held back while someone sits on them.
let running = false

export function setBreathing(on: boolean): void {
  running = on
}

export function isBreathing(): boolean {
  return running
}
