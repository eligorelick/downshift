// Legacy workout implementation, retained for reversibility and safety tests; not exported by active core.
// Workout rest coach. The rest floor is a clock set by the goal, and heart rate never shortens it: we know
// of no study linking HR recovery to muscle recovery between sets. After the floor, HR can only say "not
// yet" or flag the reading as unreliable (wrist optical HR is poor during lifting; a chest strap is better).
// Evidence: docs/evidence-workout-work.md (Workout mode).
import type { RestAdvice, SetRecord } from '../setRecord'
import type { Goal } from '../settings'

export type { RestAdvice, SetRecord }

export interface RestFloors {
  strength: number
  hypertrophy: number
  hypertrophyIsolation: number
  endurance: number
} // seconds

// Past this the cue stops waiting for HR; long enough for the strength recommendations (3-5 min).
export const REST_CAP_SEC: Record<Goal, number> = { strength: 300, hypertrophy: 180, endurance: 90 }

export type CoachPhase = 'idle' | 'set' | 'rest' | 'done'

export interface CoachView {
  phase: CoachPhase
  setNumber: number
  elapsedMs: number
  floorMs: number
  capMs: number
  advice: RestAdvice
  bpm: number | null
  preSetBpm: number | null
  peakBpm: number | null
  recoveredPct: number | null
  suggestRest: boolean
}

interface Reading {
  t: number
  bpm: number
  contact: boolean | undefined
}

interface Peak {
  v: number
  t: number
}

const BUFFER_MS = 10 * 60_000
const HR_FRESH_MS = 10_000
const MIN_PRE_SET_READINGS = 3
// Below this the set barely moved HR, so there is nothing to recover from (starting point, not evidence).
const MIN_PEAK_ABOVE_PRE = 5

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 === 1 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2
}

export class RestCoach {
  // The "settled" thresholds are starting points: we couldn't find a published HR curve after a lifting set.
  static readonly SETTLED_WITHIN = 0.1
  static readonly PLATEAU_BPM = 2
  static readonly PLATEAU_WINDOW_MS = 15_000
  static readonly PLATEAU_WITHIN = 0.2
  static readonly SUGGEST_MIN_SET_MS = 20_000
  static readonly SUGGEST_DROP_BPM = 8
  static readonly SUGGEST_FALLING_MS = 10_000
  static readonly ARTEFACT_JUMP_BPM = 25
  static readonly ARTEFACT_WINDOW_MS = 2_000
  static readonly PRE_SET_WINDOW_MS = 15_000
  static readonly PEAK_REST_WINDOW_MS = 20_000
  static readonly SMOOTH_MS = 5_000

  goal: Goal = 'strength'
  compound = true
  readonly records: SetRecord[] = []

  private readings: Reading[] = []
  private phase: CoachPhase = 'idle'
  private setStart = 0
  private restStart = 0
  private setPeak: Peak | null = null
  private suggestHandled = false
  private suggestLatched = false
  private readonly floors: () => RestFloors
  private readonly hrCues: () => boolean
  private readonly suggest: () => boolean

  constructor(floors: () => RestFloors, opts?: { hrCues?: () => boolean; suggest?: () => boolean }) {
    this.floors = floors
    this.hrCues = opts?.hrCues ?? (() => true)
    this.suggest = opts?.suggest ?? (() => true)
  }

  push(t: number, bpm: number, contact?: boolean): void {
    if (!Number.isFinite(t) || !Number.isFinite(bpm)) return
    const last = this.readings[this.readings.length - 1]
    if (last && t < last.t) return
    this.readings.push({ t, bpm, contact })
    let drop = 0
    while (drop < this.readings.length && (this.readings[drop] as Reading).t < t - BUFFER_MS) drop++
    if (drop > 0) this.readings.splice(0, drop)
  }

  // A new workout starts from scratch; the readings go too so an old rest cannot leak into the next pre-set baseline.
  reset(): void {
    this.records.length = 0
    this.readings = []
    this.phase = 'idle'
    this.setStart = 0
    this.restStart = 0
    this.setPeak = null
    this.suggestHandled = false
    this.suggestLatched = false
  }

  startSet(now: number): void {
    if (this.phase !== 'idle' && this.phase !== 'rest') return
    if (this.phase === 'rest') this.closeRest(now)
    const pre = this.readings.filter((r) => r.t > now - RestCoach.PRE_SET_WINDOW_MS && r.t <= now)
    this.records.push({
      n: this.records.length + 1,
      goal: this.goal,
      compound: this.compound,
      setStart: now,
      setEnd: now,
      restEnd: null,
      preSetBpm: pre.length < MIN_PRE_SET_READINGS ? null : median(pre.map((r) => r.bpm)),
      peakBpm: null,
      endRestBpm: null,
      adviceAtEnd: null,
      suggested: false,
    })
    this.setStart = now
    this.suggestHandled = false
    this.suggestLatched = false
    this.setPeak = null
    this.phase = 'set'
  }

  endSet(now: number, at?: number): void {
    if (this.phase !== 'set') return
    const start = Math.min(Math.max(at ?? now, this.setStart), now)
    this.restStart = start
    // Cached so a long set plus rest cannot lose its peak from the 10-minute buffer.
    this.setPeak = this.maxSmoothed(this.setStart, start)
    ;(this.rec() as SetRecord).setEnd = start
    this.phase = 'rest'
  }

  // The peak is where the set effectively ended, so the rest clock starts there, not at the tap.
  acceptSuggestion(now: number): void {
    if (this.phase !== 'set') return
    const peak = this.maxSmoothed(this.setStart, now)
    ;(this.rec() as SetRecord).suggested = true
    this.endSet(now, peak?.t)
  }

  dismissSuggestion(): void {
    this.suggestHandled = true
  }

  finish(now: number): SetRecord[] {
    if (this.phase === 'rest') this.closeRest(now)
    else if (this.phase === 'set') {
      const r = this.rec() as SetRecord
      r.setEnd = now
      r.peakBpm = this.maxSmoothed(this.setStart, now)?.v ?? null
    }
    this.phase = 'done'
    return this.records.map((r) => ({ ...r }))
  }

  floorSec(): number {
    const f = this.floors()
    if (this.goal === 'strength') return f.strength
    if (this.goal === 'endurance') return f.endurance
    return this.compound ? f.hypertrophy : f.hypertrophyIsolation
  }

  view(now: number): CoachView {
    const rec = this.rec()
    const floorMs = this.floorSec() * 1000
    const capMs = Math.max(REST_CAP_SEC[this.goal] * 1000, floorMs)
    const latest = this.latest(now)
    const view: CoachView = {
      phase: this.phase,
      setNumber: this.phase === 'idle' ? 0 : this.records.length,
      elapsedMs: 0,
      floorMs,
      capMs,
      advice: 'counting',
      bpm: latest && latest.t > now - HR_FRESH_MS ? latest.bpm : null,
      preSetBpm: rec?.preSetBpm ?? null,
      peakBpm: null,
      recoveredPct: null,
      suggestRest: false,
    }
    if (this.phase === 'set') {
      const peak = this.maxSmoothed(this.setStart, now)
      view.peakBpm = peak?.v ?? null
      view.suggestRest = this.suggestionActive(now, peak)
    } else if (this.phase === 'rest') {
      view.elapsedMs = now - this.restStart
      view.peakBpm = this.restPeak(now)?.v ?? null
      view.advice = this.restAdvice(now, view.elapsedMs, floorMs, capMs, view.preSetBpm, view.peakBpm)
      const cur = this.smoothed(this.judgeAt(now))
      const pre = view.preSetBpm
      const peak = view.peakBpm
      if (pre !== null && peak !== null && cur !== null && peak > pre) {
        view.recoveredPct = Math.min(100, Math.max(0, ((peak - cur) / (peak - pre)) * 100))
      }
    }
    return view
  }

  private rec(): SetRecord | undefined {
    return this.records[this.records.length - 1]
  }

  // Recovery is judged at the newest fresh reading: a strap that pauses for a few seconds still counts as
  // live (HR_FRESH_MS) even though the 5-second median at `now` would be empty.
  private judgeAt(now: number): number {
    const l = this.latest(now)
    return l && l.t > now - HR_FRESH_MS ? l.t : now
  }

  private latest(now: number): Reading | null {
    for (let i = this.readings.length - 1; i >= 0; i--) {
      const r = this.readings[i] as Reading
      if (r.t <= now) return r
    }
    return null
  }

  // First index with reading time > t (buffer is time-sorted).
  private after(t: number): number {
    let lo = 0
    let hi = this.readings.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if ((this.readings[mid] as Reading).t <= t) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  // Median of readings in (t - 5 s, t]; ignores one-off spikes.
  private smoothed(t: number): number | null {
    const xs: number[] = []
    for (let i = this.after(t - RestCoach.SMOOTH_MS); i < this.readings.length; i++) {
      const r = this.readings[i] as Reading
      if (r.t > t) break
      xs.push(r.bpm)
    }
    return median(xs)
  }

  // Highest smoothed value over readings in [from, to]; ties go to the later time (the end of the plateau).
  // One pass with a sorted sliding window, so a long buffer stays linear.
  private maxSmoothed(from: number, to: number): Peak | null {
    const start = this.after(from - 1)
    const first = this.readings[start]
    if (!first) return null
    let lo = this.after(first.t - RestCoach.SMOOTH_MS)
    const win: number[] = []
    const insert = (v: number) => {
      let a = 0
      let b = win.length
      while (a < b) {
        const m = (a + b) >> 1
        if ((win[m] as number) < v) a = m + 1
        else b = m
      }
      win.splice(a, 0, v)
    }
    const remove = (v: number) => {
      let a = 0
      let b = win.length
      while (a < b) {
        const m = (a + b) >> 1
        if ((win[m] as number) < v) a = m + 1
        else b = m
      }
      win.splice(a, 1)
    }
    for (let k = lo; k < start; k++) insert((this.readings[k] as Reading).bpm)
    let best: Peak | null = null
    for (let k = start; k < this.readings.length; k++) {
      const r = this.readings[k] as Reading
      if (r.t > to) break
      insert(r.bpm)
      while (lo < k && (this.readings[lo] as Reading).t <= r.t - RestCoach.SMOOTH_MS) {
        remove((this.readings[lo] as Reading).bpm)
        lo++
      }
      const m = win.length >> 1
      const v = win.length % 2 === 1 ? (win[m] as number) : ((win[m - 1] as number) + (win[m] as number)) / 2
      if (best === null || v >= best.v) best = { v, t: r.t }
    }
    return best
  }

  // HR can climb for a few seconds after the last rep, so look for the peak in the first 20 s of rest.
  private restPeak(now: number): Peak | null {
    const end = Math.min(now, this.restStart + RestCoach.PEAK_REST_WINDOW_MS)
    const rest = this.maxSmoothed(this.restStart, end)
    if (this.setPeak === null) return rest
    return rest !== null && rest.v >= this.setPeak.v ? rest : this.setPeak
  }

  private unreliable(now: number): boolean {
    const rest = this.readings.filter((r) => r.t >= this.restStart && r.t <= now)
    if (rest.some((r) => r.contact === false)) return true
    for (let i = 0; i < rest.length; i++) {
      const a = rest[i] as Reading
      for (let j = i + 1; j < rest.length; j++) {
        const b = rest[j] as Reading
        if (b.t - a.t > RestCoach.ARTEFACT_WINDOW_MS) break
        if (Math.abs(b.bpm - a.bpm) > RestCoach.ARTEFACT_JUMP_BPM) return true
      }
    }
    return false
  }

  private settled(now: number, pre: number | null, peak: number | null): boolean {
    const cur = this.smoothed(now)
    if (pre === null || peak === null || cur === null) return false
    if (peak - pre < MIN_PEAK_ABOVE_PRE) return true
    if (cur <= pre * (1 + RestCoach.SETTLED_WITHIN)) return true
    const before = this.smoothed(now - RestCoach.PLATEAU_WINDOW_MS)
    return (
      before !== null &&
      Math.abs(cur - before) < RestCoach.PLATEAU_BPM &&
      cur <= pre * (1 + RestCoach.PLATEAU_WITHIN)
    )
  }

  private restAdvice(
    now: number,
    elapsed: number,
    floorMs: number,
    capMs: number,
    pre: number | null,
    peak: number | null,
  ): RestAdvice {
    if (elapsed < floorMs) return 'counting'
    if (elapsed >= capMs) return 'ready'
    const latest = this.latest(now)
    // Without a pre-set baseline recovery cannot be judged, so treat it like no HR.
    if (!this.hrCues() || pre === null || latest === null || latest.t <= now - HR_FRESH_MS) return 'ready'
    if (this.unreliable(now)) return 'hr-unreliable'
    return this.settled(latest.t, pre, peak) ? 'ready' : 'hr-high'
  }

  // Guessing the set end from HR alone is our own heuristic (no source), so it's kept conservative.
  // Once due it stays on until accepted, dismissed or the set ends, so a later rise cannot retract it.
  private suggestionActive(now: number, peak: Peak | null): boolean {
    if (!this.suggest() || this.suggestHandled) return false
    if (!this.suggestLatched && this.suggestionDue(now, peak)) this.suggestLatched = true
    return this.suggestLatched
  }

  private suggestionDue(now: number, peak: Peak | null): boolean {
    if (now - this.setStart < RestCoach.SUGGEST_MIN_SET_MS) return false
    const s0 = this.smoothed(now)
    const s5 = this.smoothed(now - RestCoach.SMOOTH_MS)
    const s10 = this.smoothed(now - RestCoach.SUGGEST_FALLING_MS)
    if (peak === null || s0 === null || s5 === null || s10 === null) return false
    return peak.v - s0 >= RestCoach.SUGGEST_DROP_BPM && s0 <= s5 && s5 <= s10
  }

  private closeRest(now: number): void {
    const r = this.rec() as SetRecord
    const v = this.view(now)
    r.restEnd = now
    r.peakBpm = v.peakBpm
    r.endRestBpm = this.smoothed(this.judgeAt(now))
    r.adviceAtEnd = v.advice
  }
}
