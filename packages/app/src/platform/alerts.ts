import { getSettings } from '../state/settingsStore'

export interface AlertOptions {
  title: string
  body?: string
  sound?: boolean
  vibrate?: boolean
  // false still plays the tone and vibrates but shows no banner or system notification (the caller is already on screen).
  banner?: boolean
}

export interface AlertEvent {
  id: number
  title: string
  body?: string
}

const subs = new Set<(e: AlertEvent) => void>()
let nextId = 1

export function onAlert(cb: (e: AlertEvent) => void): () => void {
  subs.add(cb)
  return () => subs.delete(cb)
}

// One AudioContext for the whole app, so a tap anywhere unlocks every later sound.
let ctx: AudioContext | null = null

// iOS and Safari only allow audio after a user gesture, so the context is made and resumed on the first tap or key.
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // No WebAudio; alerts stay silent.
  }
}

export function installAudioUnlock(): void {
  const once = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', once)
    window.removeEventListener('keydown', once)
  }
  window.addEventListener('pointerdown', once)
  window.addEventListener('keydown', once)
}

// A soft sine note with a quick fade in and a slow fade out; a startling beep would defeat a calming app.
export function playTone(freqHz: number, ms: number, gain = 0.2, delayMs = 0): void {
  const s = getSettings()
  if (s.mute || s.volume <= 0) return
  try {
    ctx ??= new AudioContext()
    const c = ctx
    if (c.state === 'suspended') void c.resume()
    const peak = Math.max(0.0001, gain * (s.volume / 100))
    const start = c.currentTime + delayMs / 1000
    const end = start + ms / 1000
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freqHz
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.04, ms / 3000))
    g.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(g).connect(c.destination)
    osc.start(start)
    osc.stop(end + 0.05)
  } catch {
    // Audio can be blocked before the first tap.
  }
}

export function alert(opts: AlertOptions): void {
  const s = getSettings()
  const e: AlertEvent = { id: nextId++, title: opts.title, body: opts.body }
  const banner = opts.banner !== false
  if (banner) for (const cb of [...subs]) cb(e)
  if (opts.sound) {
    playTone(523.25, 600, 0.25)
    playTone(659.25, 600, 0.25, 220)
  }
  if (opts.vibrate !== false && s.vibrate) navigator.vibrate?.(200)
  if (
    banner &&
    document.hidden &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(opts.title, { body: opts.body, icon: './icon-192.png', silent: true })
    } catch {
      // Some mobile browsers only allow notifications through a service worker.
    }
  }
}
