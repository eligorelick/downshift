import { useId, useState } from 'react'
import { Button } from './Button'
import { RatingScale, SHARPNESS_LABELS } from './RatingScale'

interface Props {
  onRate: (rating: number) => void
  onSkip: () => void
}

// Asked once after a session, and easy to skip. The ratings feed the time-of-day card in History, since
// the best hours differ from person to person (docs/evidence-cognition.md section 5).
export function SharpnessPrompt({ onRate, onSkip }: Props) {
  const [rating, setRating] = useState<number | null>(null)
  const titleId = useId()
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset legend cannot be the card heading; the group is named by the h2
    <section className="card fc-sharp" role="group" aria-labelledby={titleId}>
      <h2 id={titleId}>How sharp did you feel this session?</h2>
      <RatingScale
        value={rating}
        onChange={setRating}
        legend="1 is foggy, 5 is very sharp"
        labels={SHARPNESS_LABELS}
      />
      <div className="row">
        <Button disabled={rating === null} onClick={() => rating !== null && onRate(rating)}>
          Save rating
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </section>
  )
}
