import {
  type BlockHrContext,
  type BreakSuggestion,
  type Due,
  type Feeling,
  FocusClock,
  NudgeDetector,
  PRESETS,
  type Preset,
  type PresetKey,
  type Settings,
  blockHrNote,
  budgetAllows,
  budgetSpend,
  dayKey,
  minutesPhrase,
  minutesRaised,
  rollToday,
  suggestBreak,
} from '@downshift/core'
import { useSyncExternalStore } from 'react'
import { alert, clearAlerts, stopTones } from '../platform/alerts'
import { stopSpeaking } from '../platform/speech'
import { acquireWakeLock, releaseWakeLock } from '../platform/wakeLock'
import { now } from '../state/clock'
import { STALE_MS, getHeartRate, onHeartRate, subscribeHeartRate } from '../state/hrStore'
import * as logStore from '../state/logStore'
import { parseHash } from '../state/route'
import { getSettings, subscribeSettings, updateSettings } from '../state/settingsStore'
import { isBreathing, startBreathe, subscribeBreathing } from './breathSession'

// 0.1.0 held a prompt until the user had paused for 1.5 s so it never lands mid-sentence, and showed it
// after 20 s regardless. The browser only sees activity in this window, not system-wide as 0.1.0 did.
const QUIET_MS = 1500
const MAX_WAIT_MS = 20_000
// A high-heart-rate check-in is a safety question, so it is not rationed by the daily cap; once an hour at most.
const HIGH_EVERY_MS = 3_600_000
// A product choice to give a person room to continue; not a validated physiological interval.
const COMPANION_SNOOZE_MS = 15 * 60_000
// Based on a lunchtime park walk study (Sianoja 2018, docs/evidence.md). The minutes match the preset's long
// break so the advice never promises more time than the timer gives.
const outsideNote = (longBreakMin: number): string =>
  `Step outside for about ${longBreakMin} minutes if you can.`
const NO_TIME = -Number.MAX_SAFE_INTEGER / 4

export type NudgeAnswer = 'breathe' | 'fine' | 'moving' | 'dismissed'

export interface NudgePromptInfo {
  due: Exclude<Due, 'none'>
  rise: number
  minutes: number
  bpm: number
  baseline: number
  highLimit: number
  // When the prompt appeared; its log row is dated by this, not by when it was answered.
  shownAt?: number
  // Whether the reading behind it came from the demo, fixed when it was detected (the source can change later).
  demo?: boolean
}

export interface FocusView {
  active: boolean
  phase: FocusClock['phase']
  preset: Preset
  blockMin: number
  blockNumber: number
  note: string
  headsUp: boolean
  canSnooze: boolean
  canExtend: boolean
  breakMinutes: number
  breakIsLong: boolean
  // null until the question is answered (or skipped by the askFeeling setting).
  feeling: Feeling | null
  feelingAsked: boolean
  // Heart rate note shown with the feeling question (context only).
  hrNote: string | null
  suggestion: BreakSuggestion | null
  longNote: string | null
  prompt: NudgePromptInfo | null
  // True after a session of at least a minute ends, until the sharpness question is answered or skipped.
  askSharpness: boolean
  companion: CompanionView
}

export interface CompanionView {
  enabled: boolean
  status:
    | 'stopped'
    | 'snoozed'
    | 'breathing'
    | 'break'
    | 'waiting'
    | 'lost'
    | 'contact'
    | 'learning'
    | 'watching'
  demo: boolean
  baseline: number | null
  baselineMinutes: number
  minuteBpm: number | null
  minuteAt: number | null
  snoozedUntil: number
  cooldownUntil: number
}

// Lives outside React so the session keeps running while another page is shown.
let sessionPreset: PresetKey = 'school'
let sessionBlockMin = 25
const clock = new FocusClock(
  () => PRESETS[sessionPreset],
  () => sessionBlockMin,
)
const detector = new NudgeDetector({
  get nudgeDelta() {
    return getSettings().nudgeDelta
  },
  get nudgeMinutes() {
    return getSettings().nudgeMinutes
  },
  get highLimit() {
    return getSettings().highLimit
  },
})

let cached: FocusView | null = null
let active = false
let sessionStart = 0
let version = 0
let timer: ReturnType<typeof setInterval> | null = null
let headsUp = false
let note = ''
let feeling: Feeling | null = null
let feelingAsked = false
let hrNote: string | null = null
// Start time of the session just ended, while its sharpness question is still open.
let sharpnessFor: number | null = null
let breakLogged = false
let breakStartedAt = 0
let nudgedThisBlock = false
let prompt: NudgePromptInfo | null = null
let pendingDue: { info: NudgePromptInfo; since: number } | null = null
let lastActivity = NO_TIME
let lastGoodAt: number | null = null
let sourceKey = ''
let signalReason: 'waiting' | 'lost' | 'contact' = 'waiting'
let companionTimer: ReturnType<typeof setInterval> | null = null
let monitoringConfig = ''
let talliedMs = 0
let talliedBlocks = 0
const subs = new Set<() => void>()

function emit(): void {
  version++
  cached = null
  for (const cb of [...subs]) cb()
}

function currentSuggestion(): BreakSuggestion | null {
  if (clock.phase !== 'break' && clock.phase !== 'backDue') return null
  if (!feelingAsked) return null
  return suggestBreak(feeling, clock.breakMinutes)
}

export function getFocus(): FocusView {
  cached ??= {
    active,
    phase: clock.phase,
    preset: PRESETS[sessionPreset],
    blockMin: sessionBlockMin,
    blockNumber: clock.blockNumber,
    note,
    headsUp,
    canSnooze: clock.canSnooze,
    canExtend: clock.canExtend,
    breakMinutes: clock.breakMinutes,
    breakIsLong: clock.breakIsLong,
    feeling,
    feelingAsked,
    hrNote,
    suggestion: currentSuggestion(),
    longNote:
      clock.breakIsLong && (clock.phase === 'breakDue' || clock.phase === 'break')
        ? outsideNote(PRESETS[sessionPreset].longBreakMin)
        : null,
    prompt,
    askSharpness: sharpnessFor !== null,
    companion: companionView(),
  }
  return cached
}

export function useFocus(): FocusView {
  return useSyncExternalStore(subscribeFocus, getFocus)
}

export function subscribeFocus(cb: () => void): () => void {
  subs.add(cb)
  return () => subs.delete(cb)
}

// Time-dependent values, read with the app clock so they follow an e2e fast-forward.
export function focusTimes(t: number): { remainingMs: number; workedMs: number } {
  const inBlock = clock.phase === 'work' || clock.phase === 'breakDue'
  return {
    remainingMs: clock.remaining(t),
    workedMs: clock.workedMs + (inBlock ? Math.max(0, t - clock.blockStartedAt()) : 0),
  }
}

/* ---------- nudge monitoring ---------- */

function wantMonitoring(): boolean {
  const s = getSettings()
  if (s.nudgeSnoozedUntil > now() || isBreathing()) return false
  const mode = s.nudgeMode
  if (mode === 'always') return clock.phase !== 'break' && clock.phase !== 'backDue'
  return mode === 'focus' && active && (clock.phase === 'work' || clock.phase === 'breakDue')
}

function clearNudge(): void {
  pendingDue = null
  prompt = null
  clearAlerts('nudge')
}

function resetMonitoring(reason: typeof signalReason = 'waiting'): void {
  detector.reset()
  lastGoodAt = null
  signalReason = reason
  clearNudge()
}

function companionView(): CompanionView {
  const s = getSettings()
  const hr = getHeartRate()
  let status: CompanionView['status'] = 'stopped'
  if (s.nudgeMode === 'always') {
    if (s.nudgeSnoozedUntil > now()) status = 'snoozed'
    else if (isBreathing()) status = 'breathing'
    else if (clock.phase === 'break' || clock.phase === 'backDue') status = 'break'
    else if (lastGoodAt === null) status = signalReason
    else status = detector.last.hasBaseline ? 'watching' : 'learning'
  }
  const v = detector.last
  return {
    enabled: s.nudgeMode === 'always',
    status,
    demo: hr.kind === 'simulated',
    baseline: v.hasBaseline ? Math.round(v.baseline) : null,
    baselineMinutes: v.baselineMinutes,
    minuteBpm: v.lastMinuteBpm,
    minuteAt: v.lastMinuteAt,
    snoozedUntil: s.nudgeSnoozedUntil,
    cooldownUntil: s.lastNudgeAt ? s.lastNudgeAt + s.waitMin * 60_000 : 0,
  }
}

function reconcileSignal(t: number): void {
  const hr = getHeartRate()
  const key = `${hr.kind ?? ''}:${hr.device?.id ?? ''}`
  if (key !== sourceKey) {
    const lost = hr.kind === null && (lastGoodAt !== null || signalReason === 'lost')
    sourceKey = key
    resetMonitoring(lost ? 'lost' : 'waiting')
  }
  if (!wantMonitoring()) {
    if (detector.monitoring || lastGoodAt !== null || prompt || pendingDue) resetMonitoring()
    return
  }
  if (hr.state !== 'connected') {
    if (lastGoodAt !== null || detector.monitoring || prompt || pendingDue) resetMonitoring('lost')
    return
  }
  if (hr.contact === false) {
    resetMonitoring('contact')
    return
  }
  // Only the explicitly labeled simulator may replay synthetic history after a clock jump. Real
  // Bluetooth gaps are never filled, and a connected link cannot keep an old measurement usable.
  if (lastGoodAt !== null && hr.kind !== 'simulated' && t - lastGoodAt > STALE_MS) resetMonitoring('lost')
}

function applyMonitoring(settleMin: number): void {
  const want = wantMonitoring()
  if (want && !detector.monitoring) detector.startMonitoring(now(), settleMin)
  else if (!want && detector.monitoring) resetMonitoring()
}

function onReading(r: { t: number; bpm: number; contact?: boolean }): void {
  const hr = getHeartRate()
  const key = `${hr.kind ?? ''}:${hr.device?.id ?? ''}`
  if (key !== sourceKey) {
    sourceKey = key
    resetMonitoring()
  }
  if (!wantMonitoring()) return
  if (hr.state !== 'connected') {
    resetMonitoring('lost')
    emit()
    return
  }
  // Reading subscribers run before hrStore updates its snapshot; validate this event's contact/time.
  if (r.contact === false) {
    resetMonitoring('contact')
    emit()
    return
  }
  const t = now()
  if (
    !Number.isFinite(r.t) ||
    !Number.isFinite(r.bpm) ||
    r.bpm < 25 ||
    r.bpm > 240 ||
    r.t > t + 1000 ||
    (hr.kind !== 'simulated' && t - r.t > STALE_MS) ||
    (lastGoodAt !== null && r.t <= lastGoodAt)
  )
    return
  // A resumed tab may receive its first packet before its suspended interval callback runs. Expire
  // the old baseline against that packet too, before replacing the timestamp used by the timer guard.
  if (lastGoodAt !== null && hr.kind !== 'simulated' && r.t - lastGoodAt > STALE_MS) resetMonitoring('lost')
  if (!detector.monitoring) applyMonitoring(NudgeDetector.SETTLE_START_MIN)
  const st = detector.push(r.t, r.bpm)
  if (!st.valid) return
  lastGoodAt = r.t
  signalReason = 'waiting'
  if (st.due !== 'none') onDue(st.due, r.t)
  if (!active) checkPending(now())
  emit()
}

function onDue(due: Exclude<Due, 'none'>, t: number): void {
  // The high check-in is a safety question and the detector raises it once per episode, so it takes the place
  // of an unanswered "Feeling tense?" prompt instead of being dropped behind it.
  const busy =
    due === 'high'
      ? prompt?.due === 'high' || pendingDue?.info.due === 'high'
      : prompt !== null || pendingDue !== null
  if (busy) return
  const s = getSettings()
  if (clock.phase === 'break' || clock.phase === 'backDue') return
  if (due === 'tense' && !budgetAllows(s, t, s.lastNudgeAt || NO_TIME, dayKey(new Date(t)))) return
  if (due === 'high' && t - (s.lastHighNudgeAt || NO_TIME) < HIGH_EVERY_MS) return
  if (due === 'high') dismissPrompt()
  const v = detector.last
  pendingDue = {
    since: now(),
    info: {
      due,
      rise: Math.round(v.rise),
      minutes: v.runMinutes,
      bpm: v.bpm,
      baseline: Math.round(v.baseline),
      highLimit: s.highLimit,
      demo: getHeartRate().kind === 'simulated',
    },
  }
}

function showPrompt(info: NudgePromptInfo): void {
  const t = now()
  const s = getSettings()
  // A limit may have changed while the prompt waited for a quiet moment (including a storage update
  // from another tab). Recheck before displaying or spending anything.
  if (info.due === 'tense' && !budgetAllows(s, t, s.lastNudgeAt || NO_TIME, dayKey(new Date(t)))) return
  if (info.due === 'high' && t - (s.lastHighNudgeAt || NO_TIME) < HIGH_EVERY_MS) return
  if (info.due === 'tense') {
    nudgedThisBlock = true
    updateSettings((x) => ({ ...budgetSpend(x, dayKey(new Date(t))), lastNudgeAt: t }))
  } else {
    updateSettings({ lastHighNudgeAt: t })
  }
  prompt = { ...info, shownAt: t }
  // Home and Focus already show the check-in card. Use the rendered route so retired/unknown hashes
  // that fall back to Home do not send someone an unnecessary "open Home" notice.
  const page = parseHash(location.hash).page
  const away = document.hidden || (page !== 'focus' && page !== 'home')
  if (s.promptSound || away) {
    alert({
      title: info.due === 'tense' ? 'Feeling tense?' : `Heart rate at or above ${info.highLimit} bpm`,
      body: 'Open Downshift Home or Focus to check in.',
      sound: s.promptSound,
      vibrate: false,
      banner: away,
      scope: 'nudge',
    })
  }
  emit()
}

export function answerPrompt(answer: NudgeAnswer, rating: number | null = null): void {
  const p = prompt
  if (!p) return
  prompt = null
  clearAlerts('nudge')
  void logStore.add({
    type: 'nudge',
    t: p.shownAt ?? now(),
    due: p.due,
    baseline: p.baseline,
    bpm: p.bpm,
    answer,
    rating,
    // Demo heart rate is marked so History and the CSV never pass it off as a device reading.
    demo: p.demo || undefined,
  })
  emit()
  if (answer === 'breathe') startBreathe({ source: 'nudge', tenseBefore: rating ?? undefined })
  // The person supplied context the sensor cannot see. Learn again rather than repeatedly interpreting
  // the same episode as tension after they said they were fine or moving.
  if (answer === 'fine' || answer === 'moving') {
    resetMonitoring()
    emit()
  }
}

export function startCompanion(): void {
  if (getSettings().nudgeMode === 'always') return
  updateSettings({ nudgeMode: 'always', nudgeSnoozedUntil: 0 })
}

export function stopCompanion(): void {
  resetMonitoring()
  stopSpeaking()
  stopTones()
  updateSettings({ nudgeMode: 'off', nudgeSnoozedUntil: 0 })
}

export function snoozeCompanion(): void {
  if (getSettings().nudgeMode !== 'always') return
  resetMonitoring()
  stopSpeaking()
  stopTones()
  updateSettings({ nudgeSnoozedUntil: now() + COMPANION_SNOOZE_MS })
}

export function resumeCompanion(): void {
  if (getSettings().nudgeMode !== 'always') return
  resetMonitoring()
  updateSettings({ nudgeSnoozedUntil: 0 })
}

/* ---------- ticking ---------- */

function noteActivity(): void {
  lastActivity = now()
}

if (typeof window !== 'undefined') {
  for (const ev of ['keydown', 'pointerdown', 'pointermove']) {
    window.addEventListener(ev, noteActivity, { passive: true })
  }
  onHeartRate(onReading)
  const settingsChanged = () => {
    const s = getSettings()
    const config = `${s.nudgeMode}:${s.nudgeDelta}:${s.nudgeMinutes}:${s.highLimit}`
    if (config !== monitoringConfig) {
      monitoringConfig = config
      resetMonitoring()
    }
    if (s.nudgeMode === 'always' && companionTimer === null) companionTimer = setInterval(monitorTick, 1000)
    else if (s.nudgeMode !== 'always' && companionTimer !== null) {
      clearInterval(companionTimer)
      companionTimer = null
    }
    reconcileSignal(now())
    emit()
  }
  subscribeSettings(settingsChanged)
  subscribeHeartRate(() => {
    reconcileSignal(now())
    emit()
  })
  subscribeBreathing(() => {
    reconcileSignal(now())
    emit()
  })
  document.addEventListener('visibilitychange', monitorTick)
  window.addEventListener('pageshow', monitorTick)
  settingsChanged()
}

function monitorTick(): void {
  reconcileSignal(now())
  checkPending(now())
  emit()
}

// Shows a due prompt once the person pauses. Runs on the session tick, and on every reading outside a
// session so that "Always" mode can prompt when no focus session is running.
function checkPending(t: number): void {
  if (!pendingDue) return
  if (lastGoodAt === null) {
    pendingDue = null
    return
  }
  const inBreak = clock.phase === 'break' || clock.phase === 'backDue'
  if (isBreathing()) {
    // Never interrupt a breathing session; the wait starts again once it ends.
    pendingDue.since = t
  } else if (inBreak || !wantMonitoring()) {
    pendingDue = null
  } else if (t - lastActivity >= QUIET_MS || t - pendingDue.since >= MAX_WAIT_MS) {
    const info = pendingDue.info
    pendingDue = null
    showPrompt(info)
  }
}

function tick(): void {
  const t = now()
  const s = getSettings()
  monitorTick()
  const ev = clock.tick(t)
  if (ev === 'headsUp') {
    headsUp = true
    alert({ title: 'Break in 2 minutes', body: 'Find a stopping point.', sound: s.breakSound, vibrate: true })
    emit()
  } else if (ev === 'breakDue') {
    headsUp = false
    alert({
      title: clock.breakIsLong
        ? 'Time for a long break'
        : `Time for ${minutesPhrase(clock.breakMinutes)} break`,
      sound: s.breakSound,
      vibrate: true,
    })
    emit()
  } else if (ev === 'breakOver') {
    alert({ title: "Break's over", body: 'Ready for the next block?', sound: s.breakSound, vibrate: true })
    emit()
  }
}

/* ---------- session actions ---------- */

// Adds what has been worked since the last count to today's tally.
function tally(): void {
  const t = now()
  const ms = Math.max(0, clock.workedMs - talliedMs)
  const blocks = Math.max(0, clock.blocks - talliedBlocks)
  talliedMs = clock.workedMs
  talliedBlocks = clock.blocks
  if (ms === 0 && blocks === 0) return
  updateSettings((s: Settings) => {
    const r = rollToday(s, dayKey(new Date(t)))
    return {
      ...r,
      today: { ...r.today, focusMs: r.today.focusMs + ms, focusBlocks: r.today.focusBlocks + blocks },
    }
  })
}

export function startFocus(): void {
  if (active) return
  const s = getSettings()
  sessionPreset = s.preset
  sessionBlockMin = s.blockMin[s.preset]
  const t = now()
  sessionStart = t
  active = true
  headsUp = false
  note = ''
  // A prompt shown outside a session (Always mode) has spent its budget, so it is logged as dismissed.
  dismissPrompt()
  // Starting again leaves an unanswered question behind; it is asked once.
  sharpnessFor = null
  nudgedThisBlock = false
  talliedMs = 0
  talliedBlocks = 0
  clock.start(t)
  applyMonitoring(NudgeDetector.SETTLE_START_MIN)
  timer = setInterval(tick, 1000)
  void acquireWakeLock('focus')
  emit()
}

// Logged once, when the break ends (Next block or End session), dated by its start. It can end early
// or run long (5 more minutes), so the row records how long it really lasted.
function logBreak(): void {
  if (breakLogged) return
  breakLogged = true
  // The suggestion the break panel showed, and none if the feeling question went unanswered.
  const suggestion = feelingAsked ? suggestBreak(feeling, clock.breakMinutes).kind : null
  void logStore.add({
    type: 'break',
    t: breakStartedAt,
    minutes: clock.breakMinutes,
    doneSec: Math.max(0, Math.round((now() - breakStartedAt) / 1000)),
    long: clock.breakIsLong,
    feeling,
    suggestion,
  })
}

function dismissPrompt(): void {
  pendingDue = null
  if (prompt) answerPrompt('dismissed')
}

export function startBreak(): void {
  if (clock.phase !== 'work' && clock.phase !== 'breakDue') return
  const t = now()
  // Heart rate over this block is shown as context only; the person's answer decides the break.
  let ctx: BlockHrContext | null = null
  const v = detector.last
  if (v.hasBaseline || nudgedThisBlock) {
    ctx = {
      nudgedThisBlock,
      minutesRaised: v.hasBaseline
        ? minutesRaised(
            detector.minuteMediansSince(clock.blockStartedAt()),
            v.baseline,
            getSettings().nudgeDelta,
          )
        : 0,
    }
  }
  hrNote = blockHrNote(ctx)
  dismissPrompt()
  clock.beginBreak(t)
  breakStartedAt = t
  headsUp = false
  feeling = null
  breakLogged = false
  feelingAsked = !getSettings().askFeeling
  tally()
  applyMonitoring(NudgeDetector.SETTLE_RESUME_MIN)
  emit()
}

export function answerFeeling(f: Feeling): void {
  feeling = f
  feelingAsked = true
  emit()
}

export function snoozeBreak(): void {
  clock.snooze(now(), true)
  headsUp = true
  emit()
}

export function extendBreak(): void {
  clock.extendBreak(now())
  emit()
}

export function nextBlock(): void {
  if (clock.phase !== 'break' && clock.phase !== 'backDue') return
  logBreak()
  clock.nextBlock(now())
  note = ''
  nudgedThisBlock = false
  headsUp = false
  applyMonitoring(NudgeDetector.SETTLE_RESUME_MIN)
  emit()
}

export function endFocus(): void {
  finish(false)
}

// Ends without logging or tallying anything (used when all data is wiped).
export function discardFocus(): void {
  // An 'Always' nudge can be open with no session running; answering it would write into the wiped History.
  pendingDue = null
  prompt = null
  stopCompanion()
  // Before the active check: a session that has already ended can still have its sharpness question open,
  // and "Delete all data" must take that card away too.
  sharpnessFor = null
  // The last session's "Saved to History" line must go too: its record has just been deleted.
  lastSaved = false
  emit()
  finish(true)
}

function finish(discard: boolean): void {
  if (!active) return
  const t = now()
  if (!discard && (clock.phase === 'break' || clock.phase === 'backDue')) logBreak()
  if (discard) {
    pendingDue = null
    prompt = null
    sharpnessFor = null
  } else dismissPrompt()
  clock.stop(t)
  // Counted for today only when it is also logged (a minute or more), so Home and History agree.
  if (!discard && clock.workedMs >= 60000) tally()
  active = false
  if (timer) clearInterval(timer)
  timer = null
  headsUp = false
  lastSaved = !discard && clock.workedMs >= 60000
  if (lastSaved) {
    void logStore.add({
      type: 'focus',
      t: sessionStart,
      preset: sessionPreset,
      blocks: clock.blocks,
      focusMs: clock.workedMs,
      endedAt: t,
      sharpness: null,
    })
    // Ask once, after the work is saved, so skipping or closing the app loses nothing.
    if (getSettings().askSharpness) sharpnessFor = sessionStart
  }
  applyMonitoring(NudgeDetector.SETTLE_START_MIN)
  void releaseWakeLock('focus')
  emit()
}

export function answerSharpness(rating: number): void {
  const t = sharpnessFor
  sharpnessFor = null
  if (t !== null) void logStore.rateFocus(t, rating)
  emit()
}

export function skipSharpness(): void {
  sharpnessFor = null
  emit()
}

// What the person sees after Stop, until they start again.
// True only when the last session was written to the log, so the page never claims a discarded one was saved.
let lastSaved = false

export function lastSummary(): { blocks: number; workedMs: number; saved: boolean } {
  return { blocks: clock.blocks, workedMs: clock.workedMs, saved: lastSaved }
}

export function setNote(text: string): void {
  note = text
  emit()
}

export function startBreakBreathe(): void {
  startBreathe({ source: 'break', minutes: clock.breakMinutes < 5 ? 2 : 5 })
}
