import { now } from '../state/clock'
import { getHeartRate, subscribeHeartRate } from '../state/hrStore'
import { getSettings, subscribeSettings, updateSettings } from '../state/settingsStore'
import { isDesktop, onMute, onNavigate, rememberDevice, setMute, setTrayBpm } from './desktopBridge'

const STALE_MS = 15_000

// Connects the Electron shell (tray menu, mute, remembered device) to the app. No-op in a browser.
export function installDesktopWiring(): void {
  if (!isDesktop()) return

  onNavigate((hash) => {
    if (hash.startsWith('#')) location.hash = hash
  })

  let lastMute = getSettings().mute
  setMute(lastMute)
  onMute((mute) => {
    lastMute = mute
    if (getSettings().mute !== mute) updateSettings({ mute })
  })
  subscribeSettings(() => {
    const mute = getSettings().mute
    if (mute === lastMute) return
    lastMute = mute
    setMute(mute)
  })

  // Lets the first connect after a restart auto-pick the saved device.
  rememberDevice(getSettings().paired)

  // Back to the default tray icon when the device goes away or goes quiet.
  let showing = false
  const check = () => {
    const hr = getHeartRate()
    const stale = hr.lastAt === null || now() - hr.lastAt > STALE_MS
    const live = hr.state === 'connected' && hr.bpm !== null && !stale
    if (live) showing = true
    else if (showing) {
      showing = false
      setTrayBpm(null)
    }
  }
  subscribeHeartRate(check)
  window.setInterval(check, 5000)
}
