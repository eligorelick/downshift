import { type BreathPattern, breathAt } from '@downshift/core'
import { useEffect, useRef } from 'react'

interface Props {
  pattern: BreathPattern
  // Elapsed seconds now; the parent re-renders a few times a second for words and the countdown.
  elapsedSec: number
  // Read every animation frame, so the circle moves smoothly without a React render per frame.
  getElapsed: () => number
  totalSec: number
  reducedMotion: boolean
}

const MIN_R = 52
const MAX_R = 118

function clock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// The circle's radius follows lung fill. With reduced motion it stays still and only the words change.
export function Pacer({ pattern, elapsedSec, getElapsed, totalSec, reducedMotion }: Props) {
  const orb = useRef<SVGCircleElement>(null)
  const ph = breathAt(pattern, elapsedSec)

  useEffect(() => {
    if (reducedMotion) {
      orb.current?.setAttribute('r', String((MIN_R + MAX_R) / 2))
      return
    }
    let raf = 0
    const frame = () => {
      const fill = breathAt(pattern, getElapsed()).fill
      orb.current?.setAttribute('r', String(MIN_R + (MAX_R - MIN_R) * fill))
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [pattern, getElapsed, reducedMotion])

  return (
    <div className="pacer">
      <svg viewBox="0 0 260 260" className="pacer-svg" aria-hidden="true">
        <circle cx="130" cy="130" r={MAX_R + 8} className="pacer-ring" />
        <circle ref={orb} cx="130" cy="130" r={MIN_R} className="pacer-orb" />
        <text x="130" y="130" className="pacer-secs num" textAnchor="middle" dominantBaseline="central">
          {Math.ceil(ph.remaining)}
        </text>
      </svg>
      <p className="pacer-label" aria-live="polite">
        {ph.step.label}
      </p>
      <p className="pacer-total muted">
        <span className="num">{clock(totalSec - elapsedSec)}</span> left
      </p>
    </div>
  )
}
