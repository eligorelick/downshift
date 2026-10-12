import { getSettings } from '../state/settingsStore'

export function say(text: string): void {
  const s = getSettings()
  if (s.mute || !s.voice || s.volume <= 0 || typeof speechSynthesis === 'undefined') return
  const u = new SpeechSynthesisUtterance(text)
  u.volume = s.volume / 100
  u.rate = 0.9
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}
