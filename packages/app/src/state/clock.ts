import { useEffect, useState } from 'react'

declare global {
  interface Window {
    // e2e tests move this offset (ms) to fast-forward every timer in the app.
    __downshiftClock?: { offset: number }
  }
}

export function now(): number {
  return Date.now() + (typeof window === 'undefined' ? 0 : (window.__downshiftClock?.offset ?? 0))
}

// Re-renders on a timer and when the tab returns to the foreground, because browsers throttle
// timers in background tabs and the display would otherwise show stale time.
export function useNow(intervalMs = 250): number {
  const [t, setT] = useState(now)
  useEffect(() => {
    const tick = () => setT(now())
    const id = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    tick()
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])
  return t
}
