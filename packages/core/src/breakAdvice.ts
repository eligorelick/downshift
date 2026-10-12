export type Feeling = 'tense' | 'tired' | 'fine'

// Minutes in this block whose median was at least baseline + nudgeDelta.
export interface BlockHrContext {
  nudgedThisBlock: boolean
  minutesRaised: number
}

export interface BreakSuggestion {
  kind: 'breathe' | 'move' | 'rest'
  title: string
  detail: string
  offerBreathe: boolean
}

const RAISED_MINUTES_TO_MENTION = 3

// Note shown beside "How are you feeling?". It only reports what the device saw: a raised heart rate is as
// likely to be effort as tension, so the break type comes from the person's answer.
// Evidence: docs/evidence-cognition.md sections 3-4.
export function blockHrNote(ctx: BlockHrContext | null): string | null {
  if (ctx === null) return null
  if (ctx.minutesRaised >= 1 && (ctx.nudgedThisBlock || ctx.minutesRaised >= RAISED_MINUTES_TO_MENTION)) {
    const n = ctx.minutesRaised
    return `Your heart rate was up for ${n} ${n === 1 ? 'minute' : 'minutes'} of this block.`
  }
  // A prompt fired, but no whole minute counted: say so without inventing a duration.
  if (ctx.nudgedThisBlock) return 'Your heart rate was up enough to prompt a check-in during this block.'
  return null
}

// Tense: a breathing break. Tired: move, ideally outside. Otherwise: time away from the screen, since phone
// breaks restored less. "Rest your eyes" and "look at something far away" are our own additions.
// Evidence: docs/evidence.md.
export function suggestBreak(feeling: Feeling | null, breakMinutes: number): BreakSuggestion {
  if (feeling === 'tense') {
    return {
      kind: 'breathe',
      title: 'Slow breathing',
      detail:
        breakMinutes < 5
          ? 'Two minutes of slow breathing, then rest your eyes.'
          : 'Five minutes of slow breathing, then rest your eyes.',
      offerBreathe: true,
    }
  }
  if (feeling === 'tired') {
    return {
      kind: 'move',
      title: 'Move',
      detail: 'Walk, take the stairs or stretch. Outside or with a view of greenery if you can.',
      offerBreathe: false,
    }
  }
  return {
    kind: 'rest',
    title: 'Step away',
    detail: 'Leave the screen and your phone. Look at something far away.',
    offerBreathe: false,
  }
}

export function minutesRaised(minuteMedians: number[], baseline: number, delta: number): number {
  let n = 0
  for (const m of minuteMedians) if (m >= baseline + delta) n++
  return n
}
