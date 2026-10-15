export type Due = 'none' | 'tense' | 'high'

export interface NudgeState {
  valid: boolean
  bpm: number
  monitoring: boolean
  hasBaseline: boolean
  baseline: number
  baselineMinutes: number // usable minutes in the lagged baseline window, including while collecting
  threshold: number
  lastMinuteBpm: number | null // median of the most recently closed usable, sufficiently sampled minute
  lastMinuteAt: number | null // start time of that minute; null when the closed minute was unusable
  rise: number // last full minute, relative to baseline
  runMinutes: number // consecutive minutes at or above the threshold
  highMinutes: number // consecutive minutes at or above the high limit
  holdOff: boolean // relative-rise counting is paused after an abrupt HR jump
  due: Due
}

// A Settings object satisfies this. It is read live, so changes apply to the next minute closed.
export interface NudgeConfig {
  nudgeDelta: number
  nudgeMinutes: number
  highLimit: number
}

interface Minute {
  index: number
  value: number
  ok: boolean
  usable: boolean
  held: boolean
}

interface Point {
  t: number
  v: number
}

const MIN_BPM = 25
const MAX_BPM = 240
const MOVE_JUMP_BPM = 15
const MOVE_WINDOW_SEC = 10
const MOVE_HOLD_OFF_MIN = 3
const HIGH_MINUTES_NEEDED = 10
const BASELINE_WINDOW_MIN = 30
const MIN_BASELINE_MINUTES = 5
const MIN_SAMPLES_PER_MINUTE = 30
const MAX_SAMPLE_GAP_MS = 15000

// "No time yet". C# used long.MinValue / 4; any very negative safe number works because it is only
// ever compared with `<` or `>=` and never added to, so it cannot overflow.
export const NEVER = -Number.MAX_SAFE_INTEGER / 4

// Marks "no minute is filling yet". C# used long.MinValue.
const NO_MINUTE = Number.NEGATIVE_INFINITY

// C# Math.Round rounds halves to even; Math.round rounds them up. Kept so results match 0.1.0 exactly.
export function roundHalfEven(x: number): number {
  const f = Math.floor(x)
  const diff = x - f
  if (diff < 0.5) return f
  if (diff > 0.5) return f + 1
  return f % 2 === 0 ? f : f + 1
}

// Floor division, so minute indexes are right for times before zero.
function floorDiv(a: number, b: number): number {
  return Math.floor(a / b)
}

// Sorts in place, like the C# list sort, then takes the middle (or the mean of the two middle values).
function median(v: number[]): number {
  v.sort((x, y) => x - y)
  const m = Math.floor(v.length / 2)
  return v.length % 2 === 1 ? (v[m] ?? 0) : ((v[m - 1] ?? 0) + (v[m] ?? 0)) / 2
}

function emptyState(): NudgeState {
  return {
    valid: false,
    bpm: 0,
    monitoring: false,
    hasBaseline: false,
    baseline: 0,
    baselineMinutes: 0,
    threshold: 0,
    lastMinuteBpm: null,
    lastMinuteAt: null,
    rise: 0,
    runMinutes: 0,
    highMinutes: 0,
    holdOff: false,
    due: 'none',
  }
}

// Applies product heuristics for sustained heart-rate changes, using per-minute medians. An abrupt HR jump
// pauses the relative-rise count; heart rate alone cannot establish movement or stress. Thresholds are
// configurable check-in rules, not validated measurements of either. Times are ms on one clock.
// Evidence and limitations: docs/evidence.md.
export class NudgeDetector {
  static readonly SETTLE_START_MIN = 5
  static readonly SETTLE_RESUME_MIN = 3
  static readonly MOVE_JUMP_BPM = MOVE_JUMP_BPM
  static readonly MOVE_WINDOW_SEC = MOVE_WINDOW_SEC
  static readonly MOVE_HOLD_OFF_MIN = MOVE_HOLD_OFF_MIN
  static readonly HIGH_MINUTES_NEEDED = HIGH_MINUTES_NEEDED
  static readonly MIN_BPM = MIN_BPM
  static readonly MAX_BPM = MAX_BPM
  static readonly NEVER = NEVER

  private readonly cfg: NudgeConfig
  private minutes: Minute[] = []
  private filling: number[] = []
  private raw: Point[] = [] // last few readings, for a 3-point median
  private smooth: Point[] = [] // last MOVE_WINDOW_SEC of smoothed readings
  private fillingIndex = NO_MINUTE
  private fillingUsable = false
  private fillingHeld = false
  private _monitoring = false
  private settleUntil = 0
  private moveHoldUntil = NEVER
  private tenseLatched = false
  private highLatched = false
  private lastT = Number.NEGATIVE_INFINITY
  private _last: NudgeState = emptyState()

  constructor(cfg: NudgeConfig) {
    this.cfg = cfg
  }

  get monitoring(): boolean {
    return this._monitoring
  }

  get last(): NudgeState {
    return this._last
  }

  reset(): void {
    this.minutes = []
    this.filling = []
    this.raw = []
    this.smooth = []
    this.fillingIndex = NO_MINUTE
    this.fillingUsable = false
    this.fillingHeld = false
    this.settleUntil = 0
    this.lastT = Number.NEGATIVE_INFINITY
    this._monitoring = false
    this.moveHoldUntil = NEVER
    this.tenseLatched = false
    this.highLatched = false
    this._last = emptyState()
  }

  // Begin counting minutes toward the baseline and the nudge. The first `settleMinutes` are ignored
  // because heart rate is still coming down from whatever came before.
  startMonitoring(now: number, settleMinutes: number): void {
    this._monitoring = true
    this.settleUntil = now + settleMinutes * 60000
    this.fillingUsable = false
    this.tenseLatched = false
    this.highLatched = false
  }

  stopMonitoring(): void {
    this._monitoring = false
    this.fillingUsable = false
    this._last.monitoring = false
    this._last.runMinutes = 0
    this._last.highMinutes = 0
    this._last.due = 'none'
  }

  // Medians of closed, usable minutes from the minute containing `t` onward. Lets the app count how many
  // minutes of a focus block ran high.
  minuteMediansSince(t: number): number[] {
    const from = floorDiv(t, 60000)
    return this.minutes.filter((m) => m.index >= from && m.ok && m.usable).map((m) => m.value)
  }

  // The newest minutes are kept out of the baseline so an episode cannot raise its own bar.
  private get lag(): number {
    return Math.max(5, this.cfg.nudgeMinutes)
  }

  push(t: number, bpm: number): NudgeState {
    if (!(bpm >= MIN_BPM && bpm <= MAX_BPM) || !Number.isFinite(t)) return emptyState()
    // A timestamp identifies one sample; duplicates must not inflate minute coverage.
    if (t <= this.lastT) return emptyState()
    const gap = Number.isFinite(this.lastT) && t - this.lastT > MAX_SAMPLE_GAP_MS
    if (gap) {
      // Invalidate both sides of a gap across a minute boundary, including any delayed minute close.
      this.fillingUsable = false
      this.raw = []
      this.smooth = []
    }
    this.lastT = t

    // HR-jump heuristic: a rise of MOVE_JUMP_BPM or more inside MOVE_WINDOW_SEC, on a 3-point median.
    this.raw.push({ t, v: bpm })
    while (this.raw.length > 3 || (this.raw[0] !== undefined && t - this.raw[0].t > 5000)) this.raw.shift()
    const smoothed = roundHalfEven(median(this.raw.map((p) => p.v)))
    while (this.smooth[0] !== undefined && t - this.smooth[0].t > MOVE_WINDOW_SEC * 1000) this.smooth.shift()
    let low = smoothed
    for (const p of this.smooth) if (p.v < low) low = p.v
    if (smoothed - low >= MOVE_JUMP_BPM) this.moveHoldUntil = t + MOVE_HOLD_OFF_MIN * 60000
    this.smooth.push({ t, v: smoothed })

    const index = floorDiv(t, 60000)
    let due: Due = 'none'
    if (index !== this.fillingIndex) {
      if (this.fillingIndex !== NO_MINUTE) due = this.closeMinute()
      this.fillingIndex = index
      this.filling = []
      this.fillingUsable = !gap && this._monitoring && t >= this.settleUntil
      this.fillingHeld = t < this.moveHoldUntil
    }
    this.filling.push(bpm)
    if (!this._monitoring || t < this.settleUntil) this.fillingUsable = false
    if (t < this.moveHoldUntil) this.fillingHeld = true

    this._last.valid = true
    this._last.bpm = bpm
    this._last.monitoring = this._monitoring
    this._last.holdOff = t < this.moveHoldUntil
    this._last.due = due
    return this._last
  }

  // Called when a minute of readings is complete. Returns what, if anything, has just become due.
  private closeMinute(): Due {
    const values = [...this.filling]
    const done: Minute = {
      index: this.fillingIndex,
      usable: this.fillingUsable,
      held: this.fillingHeld,
      ok: values.length >= MIN_SAMPLES_PER_MINUTE,
      value: values.length > 0 ? median(values) : 0,
    }
    this.minutes.push(done)
    while (this.minutes[0] !== undefined && this.minutes[0].index < done.index - 90) this.minutes.shift()

    // Baseline: median of usable minutes in the half hour that ended `lag` minutes ago.
    const newest = done.index - this.lag
    const oldest = newest - BASELINE_WINDOW_MIN
    const window: number[] = []
    for (const m of this.minutes) {
      if (m.ok && m.usable && m.index <= newest && m.index > oldest) window.push(m.value)
    }
    const has = window.length >= MIN_BASELINE_MINUTES
    const baseline = has ? median(window) : 0
    const threshold = baseline + this.cfg.nudgeDelta

    let run = 0
    let high = 0
    let countingRun = has
    let countingHigh = true
    let expect = done.index
    for (let i = this.minutes.length - 1; i >= 0 && (countingRun || countingHigh); i--) {
      const m = this.minutes[i]
      if (m === undefined) break
      if (m.index !== expect || !m.ok || !m.usable) break
      // Readings at or above the high limit belong to the check-in below, not to a breathing nudge.
      if (countingRun && !m.held && m.value >= threshold && m.value < this.cfg.highLimit) run++
      else countingRun = false
      if (countingHigh && m.value >= this.cfg.highLimit) high++
      else countingHigh = false
      expect--
    }

    this._last.hasBaseline = has
    this._last.baseline = baseline
    this._last.baselineMinutes = window.length
    this._last.threshold = threshold
    const measured = done.ok && done.usable
    this._last.lastMinuteBpm = measured ? done.value : null
    this._last.lastMinuteAt = measured ? done.index * 60000 : null
    this._last.rise = has && measured ? done.value - baseline : 0
    this._last.runMinutes = run
    this._last.highMinutes = high

    if (run === 0) this.tenseLatched = false
    if (high === 0) this.highLatched = false
    if (high >= HIGH_MINUTES_NEEDED && !this.highLatched) {
      this.highLatched = true
      this.tenseLatched = true
      return 'high'
    }
    if (run >= this.cfg.nudgeMinutes && !this.tenseLatched) {
      this.tenseLatched = true
      return 'tense'
    }
    return 'none'
  }
}
