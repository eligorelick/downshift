import { registerSW } from 'virtual:pwa-register'
import { getFocus } from '../sessions/focusSession'
import { getHeartRate } from '../state/hrStore'

const CHECK_MS = 30_000

// Applying a new version reloads the page, and a focus block, breathing session (including its
// unsaved "how tense now" step) or an open sharpness question lives only in memory. So a downloaded update
// waits until none is open, then applies itself.
export function installUpdates(): void {
  let waiting = false
  const idle = (): boolean => {
    const f = getFocus()
    // A reload also drops a heart rate connection, and reconnecting needs a tap.
    const hr = getHeartRate().state
    const linked = hr === 'connected' || hr === 'connecting' || hr === 'reconnecting' || hr === 'requesting'
    return !f.active && !f.askSharpness && !location.hash.startsWith('#breathe') && !linked
  }
  const apply = (): void => {
    if (!waiting || !idle()) return
    waiting = false
    void update(true)
  }
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      waiting = true
      apply()
    },
  })
  setInterval(apply, CHECK_MS)
}
