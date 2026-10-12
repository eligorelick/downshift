import type { Feeling } from '@downshift/core'
import { useEffect, useId, useRef, useState } from 'react'
import { type FocusView, answerFeeling, startBreakBreathe } from '../sessions/focusSession'
import { Button } from './Button'
import { Card } from './Card'
import { fmtClock } from './RestRing'

const FEELINGS: ReadonlyArray<{ value: Feeling; label: string }> = [
  { value: 'tense', label: 'Tense' },
  { value: 'tired', label: 'Tired' },
  { value: 'fine', label: 'Fine' },
]

interface Props {
  view: FocusView
  remainingMs: number
  onBack: () => void
}

// Shown during a break: asks how the person feels, then suggests a break to match. Nothing is preselected,
// and the heart rate note is only context.
export function BreakPanel({ view, remainingMs, onBack }: Props) {
  const s = view.suggestion
  const noteId = useId()
  // The answer buttons go away once someone answers, so focus moves to the suggestion; that keeps keyboard
  // focus on the card and has a screen reader read the suggestion out.
  const suggestRef = useRef<HTMLElement>(null)
  const [answered, setAnswered] = useState(false)
  useEffect(() => {
    if (answered) suggestRef.current?.focus()
  }, [answered])
  return (
    <Card>
      <p className="fc-kicker" data-stage-focus>
        {view.breakIsLong ? 'Long break' : 'Break'}
      </p>
      <p className="fc-time num" aria-hidden="true">
        {fmtClock(remainingMs + 999)}
      </p>
      {!view.feelingAsked && (
        <fieldset className="fc-feel" aria-describedby={view.hrNote ? noteId : undefined}>
          <legend>How are you feeling?</legend>
          {view.hrNote && (
            <p id={noteId} className="muted fc-feel-note">
              {view.hrNote}
            </p>
          )}
          <div className="fc-feel-row">
            {FEELINGS.map((f) => (
              <button
                key={f.value}
                type="button"
                className="fc-feel-opt"
                onClick={() => {
                  answerFeeling(f.value)
                  setAnswered(true)
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {s && (
        <section
          ref={suggestRef}
          tabIndex={-1}
          aria-label="Suggestion"
          className="fc-suggest"
          data-kind={s.kind}
        >
          <strong>{s.title}</strong>
          <span>{s.detail}</span>
          {s.offerBreathe && (
            <Button className="fc-breathe" onClick={startBreakBreathe}>
              Start breathing
            </Button>
          )}
        </section>
      )}
      {view.longNote && <p>{view.longNote}</p>}
      {view.note && <p className="muted user-text">Pick up at: {view.note}</p>}
      <Button variant="ghost" onClick={onBack}>
        Back to work
      </Button>
    </Card>
  )
}
