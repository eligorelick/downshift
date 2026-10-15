import type { RestAdvice } from '@downshift/core'

interface Props {
  elapsedMs: number
  floorMs: number
  capMs: number
  advice: RestAdvice
}

const R = 90
const C = 2 * Math.PI * R

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Elapsed rest against the minimum (the tick) and the point where waiting for heart rate stops (the full circle).
export function RestRing({ elapsedMs, floorMs, capMs, advice }: Props) {
  const frac = Math.min(1, elapsedMs / capMs)
  const floorAngle = (floorMs / capMs) * 2 * Math.PI
  const inner = 100 + Math.sin(floorAngle) * (R - 14)
  const innerY = 100 - Math.cos(floorAngle) * (R - 14)
  const outer = 100 + Math.sin(floorAngle) * (R + 14)
  const outerY = 100 - Math.cos(floorAngle) * (R + 14)
  return (
    <>
      <div className="rest-ring" data-advice={advice}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle className="ring-track" cx="100" cy="100" r={R} />
          <circle
            className="ring-fill"
            cx="100"
            cy="100"
            r={R}
            strokeDasharray={`${frac * C} ${C}`}
            transform="rotate(-90 100 100)"
          />
          <line className="ring-tick" x1={inner} y1={innerY} x2={outer} y2={outerY} />
        </svg>
        <div className="ring-center">
          <span className="ring-time num">{fmtClock(elapsedMs)}</span>
        </div>
      </div>
      <span className="ring-sub">
        minimum {fmtClock(floorMs)} · stops waiting for heart rate at {fmtClock(capMs)}
      </span>
    </>
  )
}
