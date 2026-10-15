/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { defaultSettings } from '@downshift/core'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const g = globalThis as Record<string, unknown>
const original = new Map(
  [
    'window',
    'document',
    'localStorage',
    'speechSynthesis',
    'SpeechSynthesisUtterance',
    'AudioContext',
    'Notification',
  ].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
)
const documentStub = { hidden: false, documentElement: { dataset: {}, lang: 'en', removeAttribute() {} } }
function installEnvironment() {
  g.window = new EventTarget()
  g.document = documentStub
  g.localStorage = { getItem: () => null, setItem() {} }
}
installEnvironment()
const { getSettings, updateSettings } = await import('../src/state/settingsStore')
const speech = await import('../src/platform/speech')
const alerts = await import('../src/platform/alerts')

function voice(
  voiceURI: string,
  localService = true,
  lang = 'en-US',
  isDefault = false,
): SpeechSynthesisVoice {
  return { voiceURI, name: voiceURI, localService, lang, default: isDefault }
}

class Utterance extends EventTarget {
  voice: SpeechSynthesisVoice | null = null
  volume = 1
  rate = 1
  pitch = 1
  lang = ''
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  constructor(public text: string) {
    super()
  }
}

class Synth extends EventTarget {
  voices = [voice('local')]
  queue: Utterance[] = []
  cancelled = 0
  throwOn: 'voices' | 'speak' | 'cancel' | null = null
  getVoices() {
    if (this.throwOn === 'voices') throw Error('blocked')
    return this.voices
  }
  speak(u: Utterance) {
    if (this.throwOn === 'speak') throw Error('blocked')
    this.queue.push(u)
  }
  cancel() {
    if (this.throwOn === 'cancel') throw Error('blocked')
    this.cancelled++
    this.queue = []
  }
  get speaking() {
    return this.queue.length > 0
  }
  get pending() {
    return this.queue.length > 1
  }
  paused = false
  pause() {
    this.paused = true
  }
  resume() {
    this.paused = false
  }
}
let synth: Synth
class Oscillator {
  type = 'sine'
  frequency = { value: 0 }
  onended: (() => void) | null = null
  stops: (number | undefined)[] = []
  disconnected = false
  connect(node: unknown) {
    return node
  }
  start(_at: number) {}
  stop(at?: number) {
    this.stops.push(at)
  }
  disconnect() {
    this.disconnected = true
  }
}
class Audio {
  static notes: Oscillator[] = []
  state = 'running'
  currentTime = 10
  destination = {}
  resume() {
    return Promise.resolve()
  }
  createOscillator() {
    const note = new Oscillator()
    Audio.notes.push(note)
    return note
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect: () => this.destination,
      disconnect() {},
    }
  }
}
class Notice {
  static permission = 'granted'
  static items: Notice[] = []
  closed = false
  onclose: (() => void) | null = null
  constructor(
    public title: string,
    public options: NotificationOptions,
  ) {
    Notice.items.push(this)
  }
  close() {
    this.closed = true
    this.onclose?.()
  }
}
const cleanups: (() => void)[] = []
beforeEach(() => {
  installEnvironment()
  synth = new Synth()
  g.speechSynthesis = synth
  g.SpeechSynthesisUtterance = Utterance
  g.AudioContext = Audio
  g.Notification = Notice
  Notice.items = []
  documentStub.hidden = false
  updateSettings(defaultSettings())
})
afterEach(() => {
  speech.stopSpeaking()
  if (typeof alerts.stopTones === 'function') alerts.stopTones()
  for (const off of cleanups.splice(0)) off()
  for (const [key, descriptor] of original) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(g, key)
  }
})

describe('alert lifecycle', () => {
  test('stopping tones cancels playing and scheduled oscillators immediately', () => {
    expect(typeof alerts.stopTones).toBe('function')
    updateSettings({ mute: false })
    const from = Audio.notes.length
    alerts.playTone(440, 600)
    alerts.playTone(660, 600, 0.2, 1000)
    const notes = Audio.notes.slice(from)
    expect(notes).toHaveLength(2)
    alerts.stopTones()
    expect(notes.map((note) => note.stops.at(-1))).toEqual([undefined, undefined])
    expect(notes.every((note) => note.disconnected)).toBe(true)
  })

  test('mute or zero volume cancels active tones but keeps a visual notice', () => {
    const events: { title: string; scope?: string }[] = []
    cleanups.push(alerts.onAlert((event) => events.push(event)))
    for (const patch of [{ mute: true }, { volume: 0 }]) {
      updateSettings({ mute: false, volume: 70 })
      alerts.playTone(440, 600)
      const note = Audio.notes.at(-1)
      updateSettings(patch)
      expect(note?.stops.at(-1)).toBeUndefined()
    }
    alerts.alert({ title: 'A quiet check-in', scope: 'nudge', sound: true })
    expect(events).toMatchObject([{ title: 'A quiet check-in', scope: 'nudge' }])
  })

  test('clearing one scope closes matching existing notifications and emits the scope', () => {
    expect(typeof alerts.onClearAlerts).toBe('function')
    expect(typeof alerts.clearAlerts).toBe('function')
    documentStub.hidden = true
    const cleared: (string | undefined)[] = []
    cleanups.push(alerts.onClearAlerts((scope) => cleared.push(scope)))
    alerts.alert({ title: 'Check in', scope: 'nudge' })
    alerts.alert({ title: 'Rest', scope: 'workout' })
    alerts.clearAlerts('nudge')
    expect(Notice.items.map((notice) => notice.closed)).toEqual([true, false])
    expect(cleared).toEqual(['nudge'])
    alerts.clearAlerts()
    expect(Notice.items.map((notice) => notice.closed)).toEqual([true, true])
    expect(cleared).toEqual(['nudge', undefined])
  })

  test('clear-alert listeners can unsubscribe', () => {
    expect(typeof alerts.onClearAlerts).toBe('function')
    let count = 0
    const off = alerts.onClearAlerts(() => count++)
    off()
    alerts.clearAlerts('nudge')
    expect(count).toBe(0)
  })
})

describe('spoken guidance', () => {
  test('fresh settings produce no speech', () => {
    speech.say('Take a comfortable breath.')
    expect(synth.queue).toHaveLength(0)
  })

  test('automatic guidance picks a matching local voice before a remote default', () => {
    synth.voices = [
      voice('remote', false, 'en-US', true),
      voice('local-fr', true, 'fr-FR'),
      voice('local-en'),
    ]
    updateSettings({ mute: false, voice: true, volume: 40 })
    speech.say('Take a comfortable breath.')
    expect(synth.queue[0]?.voice?.voiceURI).toBe('local-en')
    expect(synth.queue[0]?.volume).toBe(0.4)
  })

  test('only an explicitly selected voice may use a remote service', () => {
    synth.voices = [voice('remote', false)]
    updateSettings({ mute: false, voice: true })
    speech.say('A generic preview.')
    expect(synth.queue).toHaveLength(0)
    updateSettings({ voiceURI: 'remote' })
    speech.say('A generic preview.')
    expect(synth.queue[0]?.voice?.voiceURI).toBe('remote')
  })

  test('a vanished selected voice falls back locally without rewriting the preference', () => {
    updateSettings({ mute: false, voice: true, voiceURI: 'removed' })
    speech.say('A generic preview.')
    expect(synth.queue[0]?.voice?.voiceURI).toBe('local')
    expect(getSettings().voiceURI).toBe('removed')
  })

  test('a missing voice list cancels previous guidance instead of leaving it queued', () => {
    updateSettings({ mute: false, voice: true })
    speech.say('First cue.')
    expect(synth.queue).toHaveLength(1)
    synth.voices = []
    speech.say('Next cue.')
    expect(synth.queue).toHaveLength(0)
  })

  test('changing mute, spoken guidance, or volume cancels current and queued speech', () => {
    for (const patch of [{ mute: true }, { voice: false }, { volume: 0 }]) {
      updateSettings({ mute: false, voice: true, volume: 70 })
      speech.say('A generic preview.')
      expect(synth.queue).toHaveLength(1)
      updateSettings(patch)
      expect(synth.queue).toHaveLength(0)
    }
  })

  test('voice subscriptions enumerate immediately, refresh late voices, and clean up', () => {
    expect(typeof speech.subscribeVoices).toBe('function')
    synth.voices = []
    let updates = 0
    const off = speech.subscribeVoices(() => {
      updates++
    })
    cleanups.push(off)
    expect(speech.getVoiceStatus().voices).toHaveLength(0)
    synth.voices = [voice('arrived')]
    synth.dispatchEvent(new Event('voiceschanged'))
    expect(speech.getVoiceStatus().voices[0]?.voiceURI).toBe('arrived')
    expect(updates).toBeGreaterThan(0)
    off()
    const stoppedAt = updates
    synth.dispatchEvent(new Event('voiceschanged'))
    expect(updates).toBe(stoppedAt)
  })

  test('unavailable and throwing synthesis fail silently and expose an honest status', () => {
    updateSettings({ mute: false, voice: true })
    synth.throwOn = 'voices'
    expect(() => speech.say('A generic preview.')).not.toThrow()
    expect(synth.queue).toHaveLength(0)
    expect(typeof speech.getVoiceStatus).toBe('function')
    expect(speech.getVoiceStatus().error).toBeTruthy()
    synth.throwOn = 'speak'
    expect(() => speech.say('A generic preview.')).not.toThrow()
    synth.throwOn = 'cancel'
    expect(() => speech.stopSpeaking()).not.toThrow()
    g.speechSynthesis = undefined
    expect(() => speech.say('A generic preview.')).not.toThrow()
  })

  test('a native voice error is reported without escaping the utterance handler', () => {
    expect(typeof speech.getVoiceStatus).toBe('function')
    updateSettings({ mute: false, voice: true })
    speech.say('A generic preview.')
    expect(() => synth.queue[0]?.onerror?.({ error: 'voice-unavailable' })).not.toThrow()
    expect(speech.getVoiceStatus().error).toBeTruthy()
  })
})

describe('voice settings controls', () => {
  async function renderVoiceSettings() {
    const { VoiceSettings } = await import('../src/components/VoiceSettings')
    return renderToStaticMarkup(createElement(VoiceSettings))
  }

  test('muted guidance keeps the voice opt-in visible and preview disabled', async () => {
    updateSettings({ voice: true, mute: true })
    const markup = await renderVoiceSettings()
    expect(markup).toContain('Spoken guidance')
    expect(markup).toContain('Guidance voice')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Preview voice<\/button>/)
    expect(markup).toContain('Muted')
    expect(getSettings().mute).toBe(true)
  })

  test('an unavailable saved choice visibly explains its local fallback', async () => {
    updateSettings({ mute: false, voice: true, voiceURI: 'missing' })
    const markup = await renderVoiceSettings()
    expect(markup).toContain('saved voice is unavailable')
    expect(markup).toContain('Using local')
    expect(markup).toContain('Naturalness varies')
    expect(getSettings().voiceURI).toBe('missing')
  })

  test('remote-only availability leaves automatic guidance silent until an explicit choice', async () => {
    synth.voices = [voice('remote', false)]
    updateSettings({ mute: false, voice: true })
    const markup = await renderVoiceSettings()
    expect(markup).toContain('No local voice')
    expect(markup).toContain('remote service')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Preview voice<\/button>/)
  })
})
