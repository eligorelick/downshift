import type { PatternKey } from './settings'

export interface BreathStep {
  label: string
  say: string
  short: string
  seconds: number
  to: number // how full the lungs are when the step ends, 0 to 1
  tone: number
}

export interface BreathPattern {
  key: PatternKey
  name: string
  note: string
  intro: string
  steps: BreathStep[]
  cycleSeconds: number
}

function pattern(
  key: PatternKey,
  name: string,
  note: string,
  intro: string,
  steps: BreathStep[],
): BreathPattern {
  return { key, name, note, intro, steps, cycleSeconds: steps.reduce((n, s) => n + s.seconds, 0) }
}

// The first pattern is the default: six breaths a minute with no holds is the common pace and has been
// tested in several trials. The others have only small trials behind them and no shown advantage.
export const PATTERNS: BreathPattern[] = [
  pattern(
    'slow46',
    'Slow breathing, 4 in and 6 out',
    'Six breaths a minute with no holds. A commonly used pace, tested in several trials.',
    'Breathe in through your nose for four seconds and out for six.',
    [
      {
        label: 'Breathe in gently through your nose',
        say: 'Breathe in gently',
        short: 'In',
        seconds: 4,
        to: 1,
        tone: 392,
      },
      { label: 'Breathe out slowly', say: 'and slowly out', short: 'Out', seconds: 6, to: 0, tone: 262 },
    ],
  ),
  pattern(
    'slow55',
    'Slow breathing, 5 in and 5 out',
    'Also six breaths a minute. Two small tests found no HRV difference between equal and longer-exhale breathing, so pick by comfort.',
    'Breathe in through your nose for five seconds and out for five.',
    [
      {
        label: 'Breathe in gently through your nose',
        say: 'Breathe in gently',
        short: 'In',
        seconds: 5,
        to: 1,
        tone: 392,
      },
      { label: 'Breathe out slowly', say: 'and slowly out', short: 'Out', seconds: 5, to: 0, tone: 262 },
    ],
  ),
  pattern(
    'sigh',
    'Cyclic sighing',
    'Two inhales, then a long exhale. Backed mainly by one small trial; not shown to beat plain slow breathing.',
    'Breathe in through your nose, top it up with a second short inhale, then let a long breath out.',
    [
      {
        label: 'Breathe in through your nose',
        say: 'Breathe in through your nose',
        short: 'In',
        seconds: 2.5,
        to: 0.8,
        tone: 392,
      },
      {
        label: 'Sip in a little more',
        say: 'and a little more',
        short: 'more',
        seconds: 1,
        to: 1,
        tone: 494,
      },
      {
        label: 'Long, slow exhale',
        say: 'Long, slow exhale',
        short: 'Slowly out',
        seconds: 6.5,
        to: 0,
        tone: 262,
      },
    ],
  ),
  pattern(
    'box',
    'Box breathing, 4-4-4-4',
    'In, hold, out, hold. Small trials only; the holds add no proven benefit.',
    'Breathe in for four seconds, hold for four, out for four, and hold for four.',
    [
      { label: 'Breathe in gently', say: 'Breathe in gently', short: 'In', seconds: 4, to: 1, tone: 392 },
      { label: 'Hold', say: 'Hold', short: 'Hold', seconds: 4, to: 1, tone: 330 },
      { label: 'Breathe out', say: 'Breathe out', short: 'Out', seconds: 4, to: 0, tone: 262 },
      { label: 'Hold', say: 'Hold', short: 'Hold', seconds: 4, to: 0, tone: 330 },
    ],
  ),
]

export function findPattern(key: string): BreathPattern | undefined {
  return PATTERNS.find((p) => p.key === key)
}

export function getPattern(key: string): BreathPattern {
  return findPattern(key) ?? (PATTERNS[0] as BreathPattern)
}

export interface BreathPhase {
  cycle: number
  index: number
  step: BreathStep
  remaining: number
  fill: number
}

// Where in the pattern we are after `elapsedSec` seconds. Lungs ease between steps on a cosine curve.
export function breathAt(p: BreathPattern, elapsedSec: number): BreathPhase {
  const elapsed = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0
  const cycle = Math.floor(elapsed / p.cycleSeconds)
  let r = elapsed - cycle * p.cycleSeconds
  const last = p.steps.length - 1
  let from = (p.steps[last] as BreathStep).to
  for (let i = 0; i <= last; i++) {
    const step = p.steps[i] as BreathStep
    if (r < step.seconds || i === last) {
      const f = Math.min(1, Math.max(0, r / step.seconds))
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * f)
      return {
        cycle,
        index: i,
        step,
        remaining: Math.max(0, step.seconds - r),
        fill: from + (step.to - from) * ease,
      }
    }
    r -= step.seconds
    from = step.to
  }
  throw new Error('pattern has no steps')
}

export type Situation = 'tension' | 'quick-reset' | 'before-stress' | 'spike'

export interface TechniqueAdvice {
  situation: Situation
  title: string
  pattern: PatternKey
  minutes: 2 | 5
  why: string
  evidence: 'tested' | 'association' | 'small-trials' | 'one-trial' | 'starting-point'
}

// These claim a calmer feel, not better performance.
// Evidence: docs/evidence-workout-work.md, "Choosing a breathing technique".
export const TECHNIQUE_GUIDE: TechniqueAdvice[] = [
  {
    situation: 'tension',
    title: 'Tense, with time for a proper break',
    pattern: 'slow46',
    minutes: 5,
    why: 'Slow breathing near six breaths a minute is a commonly used pace, tested in several trials. The 5-minute length is an association: sessions under five minutes were linked to failed interventions.',
    evidence: 'association',
  },
  {
    situation: 'quick-reset',
    title: 'A quick reset between tasks',
    pattern: 'sigh',
    minutes: 2,
    why: "Cyclic sighing suits people who want something active. It rests on small trials and hasn't beaten slow breathing. The 2-minute length is a starting point.",
    evidence: 'small-trials',
  },
  {
    situation: 'before-stress',
    title: 'Before a stressful event (a test, talk or hard conversation)',
    pattern: 'box',
    minutes: 2,
    why: 'In one 2026 trial, box breathing and long exhales before a stress test blunted the rise in heart rate and anxiety. Not shown to improve the result. The 2-minute length is a starting point.',
    evidence: 'one-trial',
  },
  {
    situation: 'spike',
    title: 'A sudden surge of stress',
    pattern: 'slow46',
    minutes: 2,
    why: "Slow, exhale-focused breathing. No trial backs a special 'double sigh' for spikes, and the 2-minute length is a starting point.",
    evidence: 'starting-point',
  },
]
