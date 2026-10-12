import { useId } from 'react'

export const TENSION_LABELS = ['calm', 'a little tense', 'tense', 'quite tense', 'very tense'] as const
// 1 to 5, foggy to very sharp. Self-reported, since heart rate can't measure it.
export const SHARPNESS_LABELS = ['foggy', 'a bit foggy', 'okay', 'fairly sharp', 'very sharp'] as const

interface Props {
  value: number | null
  onChange: (v: number) => void
  legend?: string
  // Five words, low to high. Defaults to the tension scale.
  labels?: readonly string[]
}

export function RatingScale({
  value,
  onChange,
  legend = 'How tense do you feel?',
  labels = TENSION_LABELS,
}: Props) {
  const name = useId()
  return (
    <fieldset className="rating">
      <legend>{legend}</legend>
      <div className="rating-row">
        {labels.map((word, i) => (
          <label key={word} className="rating-opt">
            <input
              type="radio"
              name={name}
              value={i + 1}
              checked={value === i + 1}
              onChange={() => onChange(i + 1)}
            />
            <span className="n num">{i + 1}</span>
            <span className="w">{word}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
