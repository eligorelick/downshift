import { getSettings, subscribeSettings } from '../state/settingsStore'

export interface VoiceStatus {
  supported: boolean
  voices: readonly SpeechSynthesisVoice[]
  error: string | null
}

let status: VoiceStatus = { supported: false, voices: [], error: null }
const listeners = new Set<() => void>()
let voiceSource: SpeechSynthesis | null = null
let active: { utterance: SpeechSynthesisUtterance; source: SpeechSynthesis; unsubscribe: () => void } | null =
  null

function synthesis(): SpeechSynthesis | null {
  try {
    return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'
      ? speechSynthesis
      : null
  } catch {
    return null
  }
}

function refreshVoices(clearError = false): void {
  const source = synthesis()
  try {
    status = {
      supported: source !== null,
      voices: source?.getVoices() ?? [],
      error: clearError ? null : status.error,
    }
  } catch {
    status = { supported: source !== null, voices: [], error: 'Voices are unavailable in this browser.' }
  }
}

function emit(): void {
  for (const cb of [...listeners]) cb()
}

function voicesChanged(): void {
  refreshVoices(true)
  emit()
}

export function getVoiceStatus(): VoiceStatus {
  refreshVoices()
  return status
}

// The browser can return an empty list first and announce voices later. Remove the native listener when
// Settings closes; saying a cue also reads the current list so it does not depend on that screen being open.
export function subscribeVoices(cb: () => void): () => void {
  if (listeners.size === 0) {
    voiceSource = synthesis()
    try {
      voiceSource?.addEventListener('voiceschanged', voicesChanged)
    } catch {
      /* Keep the immediate list. */
    }
  }
  listeners.add(cb)
  refreshVoices()
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0) {
      try {
        voiceSource?.removeEventListener('voiceschanged', voicesChanged)
      } catch {
        /* Unavailable API. */
      }
      voiceSource = null
    }
  }
}

export function selectGuidanceVoice(
  voices: readonly SpeechSynthesisVoice[],
  savedURI: string,
): SpeechSynthesisVoice | null {
  const saved = savedURI ? voices.find((v) => v.voiceURI === savedURI) : undefined
  if (saved) return saved
  // Automatic choice is local only. A remote service requires an explicit choice in Settings.
  const local = voices.filter((v) => v.localService)
  const language =
    (typeof document !== 'undefined' && document.documentElement.lang) ||
    (typeof navigator !== 'undefined' && navigator.language) ||
    'en'
  const sameLanguage = local.filter(
    (v) => v.lang.split('-')[0]?.toLowerCase() === language.split('-')[0]?.toLowerCase(),
  )
  return (
    sameLanguage.find((v) => v.lang.toLowerCase() === language.toLowerCase()) ??
    sameLanguage.find((v) => v.default) ??
    sameLanguage[0] ??
    local.find((v) => v.default) ??
    local[0] ??
    null
  )
}

function releaseSpeech(): void {
  if (!active) return
  active.utterance.onend = null
  active.utterance.onerror = null
  active.unsubscribe()
  active = null
}

export function stopSpeaking(): void {
  const source = active?.source ?? synthesis()
  releaseSpeech()
  try {
    source?.cancel()
  } catch {
    /* Silent fallback when the native speech engine fails. */
  }
}

export function say(text: string): void {
  const s = getSettings()
  if (s.mute || !s.voice || s.volume <= 0) {
    stopSpeaking()
    return
  }
  stopSpeaking()
  const source = synthesis()
  if (!source) return
  refreshVoices(true)
  const voice = selectGuidanceVoice(status.voices, s.voiceURI)
  if (!voice) return
  try {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.volume = s.volume / 100
    utterance.rate = 0.95
    active = {
      utterance,
      source,
      unsubscribe: subscribeSettings(() => {
        const next = getSettings()
        if (next.mute || !next.voice || next.volume <= 0) stopSpeaking()
      }),
    }
    utterance.onend = releaseSpeech
    utterance.onerror = (event) => {
      releaseSpeech()
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        status = { ...status, error: 'This voice could not play. Try another guidance voice.' }
        emit()
      }
    }
    source.speak(utterance)
    emit()
  } catch {
    releaseSpeech()
    status = { ...status, error: 'Spoken guidance is unavailable in this browser.' }
    emit()
  }
}
