import { type CoachView, type Goal, RestCoach, type SetRecord, dayKey, rollToday } from '@downshift/core'
import { useSyncExternalStore } from 'react'
import { alert } from '../platform/alerts'
import { say } from '../platform/speech'
import { acquireWakeLock, releaseWakeLock } from '../platform/wakeLock'
import { now } from '../state/clock'
import { getHeartRate, onHeartRate, recentReadings } from '../state/hrStore'
import * as logStore from '../state/logStore'
import { parseHash } from '../state/route'
import { getSettings, updateSettings } from '../state/settingsStore'

export type WorkoutStage = 'setup' | 'active' | 'summary'

export interface WorkoutSummary {
  records: SetRecord[]
  sets: number
  avgRestSec: number | null
  longestRestSec: number | null
}

// Lives outside React so a workout survives page navigation and a locked screen.
const coach = new RestCoach(() => getSettings().restFloorSec, {
  hrCues: () => getSettings().restHrCues,
  suggest: () => getSettings().setEndSuggest,
})

const MIN_SET_MS = 5000
// "Set done" and "Start set" share one big button, so a double tap would end a set and start the next
// (or the reverse) and log a zero-length rest or set. A second switch this soon after the last is ignored.
const SWITCH_GUARD_MS = 1000
let lastSwitchAt = Number.NEGATIVE_INFINITY

function tooSoon(t: number): boolean {
  if (t - lastSwitchAt < SWITCH_GUARD_MS) return true
  lastSwitchAt = t
  return false
}

let stage: WorkoutStage = 'setup'
// Set when any reading in this workout came from the built-in demo; its sets are then marked as demo.
let demoSeen = false
let version = 0
let summary: WorkoutSummary | null = null
let unsubHr: (() => void) | null = null
let timer: ReturnType<typeof setInterval> | null = null
// Cue edges, so each fires once per set / rest.
let suggestFired = false
let floorFired = false
const subs = new Set<() => void>()

function emit(): void {
  version++
  for (const cb of [...subs]) cb()
}

function restSec(r: SetRecord): number | null {
  return r.restEnd === null ? null : (r.restEnd - r.setEnd) / 1000
}

export function summarize(records: SetRecord[]): WorkoutSummary {
  const rests = records.map(restSec).filter((x): x is number => x !== null)
  return {
    records,
    sets: records.length,
    avgRestSec: rests.length ? rests.reduce((a, b) => a + b, 0) / rests.length : null,
    longestRestSec: rests.length ? Math.max(...rests) : null,
  }
}

// Cues run on a timer here, not in a component, so they still fire when the user is on another page.
// The on-screen toast already says it, so skip the banner while the Workout page is showing.
function onScreen(): boolean {
  return parseHash(location.hash).page === 'workout' && !document.hidden
}

function tick(): void {
  const t = now()
  const v = coach.view(t)
  const s = getSettings()
  if (v.phase === 'set') {
    if (v.suggestRest && !suggestFired) {
      suggestFired = true
      alert({ title: 'Looks like you finished a set?', sound: s.tones, vibrate: true, banner: !onScreen() })
    }
  } else if (v.phase === 'rest' && v.advice !== 'counting' && !floorFired) {
    floorFired = true
    alert({
      title: 'Rest minimum reached',
      body: "Start when you're ready.",
      sound: s.tones,
      vibrate: true,
      banner: !onScreen(),
    })
    say('Minimum reached')
  }
}

export function startWorkout(goal: Goal, compound: boolean): void {
  if (stage === 'active') return
  coach.goal = goal
  coach.compound = compound
  coach.reset()
  lastSwitchAt = Number.NEGATIVE_INFINITY
  for (const r of recentReadings()) coach.push(r.t, r.bpm, r.contact)
  unsubHr?.()
  demoSeen = getHeartRate().kind === 'simulated'
  unsubHr = onHeartRate((r) => {
    if (getHeartRate().kind === 'simulated') demoSeen = true
    coach.push(r.t, r.bpm, r.contact)
  })
  suggestFired = false
  floorFired = false
  summary = null
  stage = 'active'
  coach.startSet(now())
  timer = setInterval(tick, 500)
  void acquireWakeLock('workout')
  emit()
}

export function setDone(): void {
  const t = now()
  if (tooSoon(t)) return
  coach.endSet(t)
  floorFired = false
  emit()
}

export function acceptSuggestion(): void {
  const t = now()
  if (tooSoon(t)) return
  coach.acceptSuggestion(t)
  floorFired = false
  emit()
}

export function dismissSuggestion(): void {
  coach.dismissSuggestion()
  emit()
}

export function startNextSet(): void {
  const t = now()
  if (tooSoon(t)) return
  coach.startSet(t)
  suggestFired = false
  emit()
}

export function finishWorkout(): void {
  if (stage !== 'active') return
  const t = now()
  // A set started by mistake (under 5 s, never rested) is not worth saving.
  const records = coach.finish(t).filter((r) => r.restEnd !== null || r.setEnd - r.setStart >= MIN_SET_MS)
  if (timer) clearInterval(timer)
  timer = null
  unsubHr?.()
  unsubHr = null
  for (const record of records)
    void logStore.add({ type: 'set', t: record.setStart, record, demo: demoSeen || undefined })
  if (records.length > 0) {
    updateSettings((s) => {
      const rolled = rollToday(s, dayKey(new Date(t)))
      return { ...rolled, today: { ...rolled.today, sets: rolled.today.sets + records.length } }
    })
  }
  summary = summarize(records)
  stage = 'summary'
  void releaseWakeLock('workout')
  emit()
}

// Ends a running workout without logging or tallying (used when all data is wiped).
export function discardWorkout(): void {
  // A finished workout's summary says "Saved to History"; after a wipe that is no longer true.
  if (stage !== 'active') {
    if (summary) resetWorkout()
    return
  }
  if (timer) clearInterval(timer)
  timer = null
  unsubHr?.()
  unsubHr = null
  coach.reset()
  summary = null
  stage = 'setup'
  void releaseWakeLock('workout')
  emit()
}

export function resetWorkout(): void {
  coach.records.length = 0
  summary = null
  stage = 'setup'
  emit()
}

export function getStage(): WorkoutStage {
  return stage
}

export function getSummary(): WorkoutSummary | null {
  return summary
}

export function coachView(t: number): CoachView {
  return coach.view(t)
}

export function currentSetStart(): number {
  return coach.records[coach.records.length - 1]?.setStart ?? now()
}

export function subscribeWorkout(cb: () => void): () => void {
  subs.add(cb)
  return () => subs.delete(cb)
}

export function useWorkout(): { stage: WorkoutStage; summary: WorkoutSummary | null } {
  useSyncExternalStore(subscribeWorkout, () => version)
  return { stage, summary }
}
