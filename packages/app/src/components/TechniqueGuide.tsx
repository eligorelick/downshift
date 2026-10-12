import { type PatternKey, TECHNIQUE_GUIDE, type TechniqueAdvice, getPattern } from '@downshift/core'
import { useId } from 'react'

const EVIDENCE_TAG: Record<TechniqueAdvice['evidence'], string> = {
  tested: 'Most tested',
  association: 'Pace tested; 5-minute length an association',
  'small-trials': 'Small trials',
  'one-trial': 'One trial',
  'starting-point': 'Starting point',
}

interface Props {
  pattern: PatternKey
  minutes: 2 | 5
  onChoose: (pattern: PatternKey, minutes: 2 | 5) => void
}

// Each option shows how well tested it is next to the advice.
export function TechniqueGuide({ pattern, minutes, onChoose }: Props) {
  const name = useId()
  return (
    <fieldset className="guide">
      <legend>What's this for?</legend>
      <div className="guide-list">
        {TECHNIQUE_GUIDE.map((a) => (
          <label key={a.situation} className="guide-card">
            <input
              type="radio"
              name={name}
              checked={a.pattern === pattern && a.minutes === minutes}
              onChange={() => onChoose(a.pattern, a.minutes)}
            />
            <span className="guide-top">
              <strong>{a.title}</strong>
              <span className="tag">{EVIDENCE_TAG[a.evidence]}</span>
            </span>
            <span className="guide-pick">
              {getPattern(a.pattern).name}, <span className="num">{a.minutes}</span> min
            </span>
            <span className="guide-why">{a.why}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
