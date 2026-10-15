import { useState } from 'react'
import type { NudgeAnswer, NudgePromptInfo } from '../sessions/focusSession'
import { Button } from './Button'
import { RatingScale } from './RatingScale'

interface Props {
  info: NudgePromptInfo
  onAnswer: (answer: NudgeAnswer, rating: number | null) => void
}

// Heart rate rises the same way for effort, challenge, threat and movement (docs/evidence-cognition.md
// section 4), so the prompt says that and asks how the person feels.
export function NudgePrompt({ info, onAnswer }: Props) {
  const [rating, setRating] = useState<number | null>(null)
  const time =
    info.shownAt === undefined
      ? null
      : new Date(info.shownAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (info.due === 'high') {
    return (
      <section className="card fc-prompt" data-due="high" aria-labelledby="fc-prompt-title">
        {time && <p className="muted small">Check-in at {time}, based on readings then.</p>}
        <h2 id="fc-prompt-title">Check in</h2>
        <p>
          Your heart rate was at or above <strong className="num">{info.highLimit}</strong> bpm for ten
          minutes. Everything OK?
        </p>
        <p className="fc-medical">
          Chest pain, faintness or trouble breathing needs medical care, not a breathing exercise.
        </p>
        <div className="row">
          <Button onClick={() => onAnswer('fine', null)}>I'm fine</Button>
          <Button variant="secondary" onClick={() => onAnswer('moving', null)}>
            I was moving
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="card fc-prompt" data-due="tense" aria-labelledby="fc-prompt-title">
      {time && <p className="muted small">Check-in at {time}, based on readings then.</p>}
      <p>
        Your heart rate was about <strong className="num">{info.rise}</strong> bpm above your recent baseline
        for <strong className="num">{info.minutes}</strong> minutes. That can be effort as well as tension.
      </p>
      <h2 id="fc-prompt-title">Feeling tense?</h2>
      <RatingScale value={rating} onChange={setRating} />
      <div className="row">
        <Button onClick={() => onAnswer('breathe', rating)}>Breathe</Button>
        <Button variant="secondary" onClick={() => onAnswer('fine', rating)}>
          I'm fine
        </Button>
        <Button variant="secondary" onClick={() => onAnswer('moving', rating)}>
          I was moving
        </Button>
      </div>
    </section>
  )
}
