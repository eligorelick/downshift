import type { DeviceRef } from './pairing'

export type NudgeMode = 'focus' | 'always' | 'off'
export type PresetKey = 'school' | 'work'
export type Goal = 'strength' | 'hypertrophy' | 'endurance'
export type PatternKey = 'slow46' | 'slow55' | 'sigh' | 'box'
export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  version: 1
  nudgeMode: NudgeMode
  nudgeDelta: number
  nudgeMinutes: number
  waitMin: number
  dailyCap: number
  highLimit: number
  promptSound: boolean
  preset: PresetKey
  blockMin: { school: number; work: number }
  breakSound: boolean
  askFeeling: boolean
  askSharpness: boolean
  goal: Goal
  restFloorSec: { strength: number; hypertrophy: number; hypertrophyIsolation: number; endurance: number }
  restHrCues: boolean
  setEndSuggest: boolean
  breathingBetweenSets: boolean
  pattern: PatternKey
  breathMinutes: 2 | 5
  voice: boolean
  tones: boolean
  tutorialDone: boolean
  mute: boolean
  vibrate: boolean
  volume: number
  theme: ThemePref
  paired: DeviceRef | null
  promptDay: number
  promptCount: number
  today: { key: number; focusBlocks: number; breaths: number; focusMs: number; sets: number }
  welcomed: boolean
}

const NUDGE_MODES: readonly NudgeMode[] = ['focus', 'always', 'off']
const PRESETS: readonly PresetKey[] = ['school', 'work']
const GOALS: readonly Goal[] = ['strength', 'hypertrophy', 'endurance']
const PATTERNS: readonly PatternKey[] = ['slow46', 'slow55', 'sigh', 'box']
const THEMES: readonly ThemePref[] = ['system', 'light', 'dark']

export function defaultSettings(): Settings {
  return {
    version: 1,
    nudgeMode: 'focus',
    nudgeDelta: 15,
    nudgeMinutes: 5,
    waitMin: 60,
    dailyCap: 3,
    highLimit: 130,
    promptSound: false,
    preset: 'school',
    blockMin: { school: 25, work: 45 },
    breakSound: true,
    askFeeling: true,
    askSharpness: true,
    goal: 'hypertrophy',
    restFloorSec: { strength: 180, hypertrophy: 120, hypertrophyIsolation: 90, endurance: 45 },
    restHrCues: true,
    setEndSuggest: true,
    breathingBetweenSets: false,
    pattern: 'slow46',
    breathMinutes: 5,
    voice: true,
    tones: true,
    tutorialDone: false,
    mute: false,
    vibrate: true,
    volume: 70,
    theme: 'system',
    paired: null,
    promptDay: 0,
    promptCount: 0,
    today: { key: 0, focusBlocks: 0, breaths: 0, focusMs: 0, sets: 0 },
    welcomed: false,
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback
}

function whole(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback
}

function readPaired(v: unknown): DeviceRef | null {
  if (typeof v !== 'object' || v === null) return null
  const { id, name } = v as Record<string, unknown>
  return typeof id === 'string' && typeof name === 'string' ? { id, name } : null
}

// Out-of-range values are pulled in rather than rejected, so a hand-edited file still loads.
export function normalize(s: Settings): Settings {
  const d = defaultSettings()
  return {
    ...s,
    version: 1,
    nudgeMode: pick(s.nudgeMode, NUDGE_MODES, d.nudgeMode),
    nudgeDelta: clamp(whole(s.nudgeDelta, d.nudgeDelta), 10, 30),
    nudgeMinutes: clamp(whole(s.nudgeMinutes, d.nudgeMinutes), 3, 10),
    waitMin: clamp(whole(s.waitMin, d.waitMin), 30, 240),
    dailyCap: clamp(whole(s.dailyCap, d.dailyCap), 1, 6),
    highLimit: clamp(whole(s.highLimit, d.highLimit), 110, 170),
    preset: pick(s.preset, PRESETS, d.preset),
    blockMin: {
      school: clamp(whole(s.blockMin?.school, d.blockMin.school), 20, 50),
      work: clamp(whole(s.blockMin?.work, d.blockMin.work), 25, 60),
    },
    askSharpness: typeof s.askSharpness === 'boolean' ? s.askSharpness : d.askSharpness,
    goal: pick(s.goal, GOALS, d.goal),
    restFloorSec: {
      strength: clamp(whole(s.restFloorSec?.strength, d.restFloorSec.strength), 60, 300),
      hypertrophy: clamp(whole(s.restFloorSec?.hypertrophy, d.restFloorSec.hypertrophy), 30, 180),
      hypertrophyIsolation: clamp(
        whole(s.restFloorSec?.hypertrophyIsolation, d.restFloorSec.hypertrophyIsolation),
        30,
        180,
      ),
      endurance: clamp(whole(s.restFloorSec?.endurance, d.restFloorSec.endurance), 15, 120),
    },
    pattern: pick(s.pattern, PATTERNS, d.pattern),
    breathMinutes: whole(s.breathMinutes, d.breathMinutes) <= 3 ? 2 : 5,
    volume: clamp(whole(s.volume, d.volume), 0, 100),
    theme: pick(s.theme, THEMES, d.theme),
    paired: readPaired(s.paired),
    promptDay: Math.max(0, whole(s.promptDay, 0)),
    promptCount: Math.max(0, whole(s.promptCount, 0)),
    today: {
      key: Math.max(0, whole(s.today?.key, 0)),
      focusBlocks: Math.max(0, whole(s.today?.focusBlocks, 0)),
      breaths: Math.max(0, whole(s.today?.breaths, 0)),
      focusMs: Math.max(0, whole(s.today?.focusMs, 0)),
      sets: Math.max(0, whole(s.today?.sets, 0)),
    },
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Keep only fields whose type matches the default, so one bad field cannot poison the rest.
function mergeInto<T extends object>(base: T, src: Record<string, unknown>): T {
  const out = { ...base } as Record<string, unknown>
  for (const key of Object.keys(base)) {
    const def = out[key]
    const val = src[key]
    if (val === undefined || key === 'paired' || key === 'version') continue
    if (isRecord(def)) {
      if (isRecord(val)) out[key] = mergeInto(def, val)
    } else if (typeof val === typeof def) {
      out[key] = val
    }
  }
  return out as T
}

// True when the stored settings were written by a newer app version. parseSettings then returns defaults
// (plus the paired device), so the app should not save over the stored value or the newer data is lost.
export function isNewerSettings(json: string | null): boolean {
  if (json === null) return false
  try {
    const raw: unknown = JSON.parse(json)
    return isRecord(raw) && typeof raw.version === 'number' && raw.version > 1
  } catch {
    return false
  }
}

export function parseSettings(json: string | null): Settings {
  const d = defaultSettings()
  if (json === null) return d
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return d
  }
  if (!isRecord(raw)) return d
  const paired = readPaired(raw.paired)
  if (raw.version !== 1) return { ...d, paired }
  return normalize({ ...mergeInto(d, raw), paired })
}

export function serializeSettings(s: Settings): string {
  return JSON.stringify(s)
}

// Resetting preferences must not forget the device, the tutorial, or today's progress and nudge budget.
export function resetPreferences(s: Settings): Settings {
  return {
    ...defaultSettings(),
    paired: s.paired ? { ...s.paired } : null,
    tutorialDone: s.tutorialDone,
    welcomed: s.welcomed,
    today: { ...s.today },
    promptDay: s.promptDay,
    promptCount: s.promptCount,
  }
}

// Rolls the daily tally over at midnight.
export function rollToday(s: Settings, key: number): Settings {
  if (s.today.key === key) return s
  return { ...s, today: { key, focusBlocks: 0, breaths: 0, focusMs: 0, sets: 0 } }
}

export function dayKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

// Nudges are rationed: one per waitMin and dailyCap per day.
export function budgetAllows(s: Settings, now: number, lastPromptAt: number, key: number): boolean {
  if (s.promptDay === key && s.promptCount >= s.dailyCap) return false
  return now - lastPromptAt >= s.waitMin * 60000
}

export function budgetSpend(s: Settings, key: number): Settings {
  const count = s.promptDay === key ? s.promptCount : 0
  return { ...s, promptDay: key, promptCount: count + 1 }
}
