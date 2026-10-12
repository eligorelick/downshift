import { type LogEvent, ratedSessionCount, sharpnessByTimeOfDay } from '@downshift/core'
import { useMemo } from 'react'
import { Card } from './Card'

// Fewer ratings than this say more about a few good or bad days than about the time of day.
const MIN_RATED = 5

// Under this many ratings a bucket is one or two moods, not a pattern, so it is drawn faint and labeled.
const FEW_RATINGS = 3

const hourOf = (t: number): number => new Date(t).getHours()

// The person's own 1-5 ratings by when each session started; see sharpnessByTimeOfDay in core. The numbers
// are written as text; the bars repeat them for sighted readers and are hidden from assistive tech.
export function SharpestHours({ events }: { events: LogEvent[] }) {
  const rows = useMemo(() => sharpnessByTimeOfDay(events, hourOf), [events])
  if (ratedSessionCount(rows) < MIN_RATED) return null
  const shown = rows.filter((r) => r.mean !== null)
  return (
    <Card title="How sharp you've felt, by time of day">
      <ul className="sharp-list">
        {shown.map((r) => (
          <li key={r.bucket} className="sharp-row" data-few={r.count < FEW_RATINGS ? 'yes' : undefined}>
            <span className="sharp-label">{r.bucket}</span>
            <span className="sharp-bar" aria-hidden="true">
              <span className="sharp-fill" style={{ width: `${((r.mean ?? 0) / 5) * 100}%` }} />
            </span>
            <span className="sharp-stat num">
              {(r.mean ?? 0).toFixed(1)} average · {r.count} {r.count === 1 ? 'session' : 'sessions'}
              {r.count < FEW_RATINGS && ' · few sessions'}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted sharp-scale">Bars run from 1 (foggy) to 5 (very sharp).</p>
      <p className="muted">With only a few sessions, treat this as a rough guide.</p>
      <p className="muted">
        Your own ratings, grouped by when sessions started. Heart rate can't tell this; how sharp people feel
        at different times varies from person to person.
      </p>
    </Card>
  )
}
