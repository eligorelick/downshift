import type { PresetKey } from './settings'

export interface Preset {
  key: PresetKey
  name: string
  blockMinDefault: number
  blockMinRange: [number, number]
  shortBreakMin(blockMin: number): number
  longAfterWorkedMin: number
  longBreakMin: number
  words: { session: string; block: string; startCta: string }
}

// Short break: 5 min up to a 25-minute block, 8 up to 50, 10 beyond. Up to 10 minutes, longer breaks went
// with larger performance effects (Albulescu 2022). Results for 12/3 conflict, so breaks stay at 5 or more.
// Smits 2025 found no difference between proportional, fixed and self-chosen breaks, so treat these as
// starting points. Evidence: docs/evidence-review.md.
const shortBreakMin = (blockMin: number): number => (blockMin <= 25 ? 5 : blockMin <= 50 ? 8 : 10)

export const PRESETS: Record<PresetKey, Preset> = {
  // 25/5 (and close variants like 24/6) is what student trials tested. The 20 to 30 min long break comes
  // from school field data (Sievertsen 2016); taking it after 100 worked minutes is a starting point.
  // Evidence: docs/evidence.md.
  school: {
    key: 'school',
    name: 'School',
    blockMinDefault: 25,
    blockMinRange: [20, 50],
    shortBreakMin,
    longAfterWorkedMin: 100,
    longBreakMin: 20,
    words: { session: 'study session', block: 'study block', startCta: 'Start studying' },
  },
  // Office-work studies support self-timed breaks that aren't left too late, not any one block length,
  // so 45 is a starting point (docs/evidence-workout-work.md, "Defaults: Work vs School").
  work: {
    key: 'work',
    name: 'Work',
    blockMinDefault: 45,
    blockMinRange: [25, 60],
    shortBreakMin,
    longAfterWorkedMin: 100,
    longBreakMin: 15,
    words: { session: 'focus session', block: 'focus block', startCta: 'Start focusing' },
  },
}
