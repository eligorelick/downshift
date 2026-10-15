import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import { getVoiceStatus, say, selectGuidanceVoice, stopSpeaking, subscribeVoices } from '../platform/speech'
import { getSettings, subscribeSettings, updateSettings } from '../state/settingsStore'
import { Button } from './Button'
import '../styles/voice.css'

export function VoiceSettings() {
  const s = useSyncExternalStore(subscribeSettings, getSettings, getSettings)
  const [status, setStatus] = useState(getVoiceStatus)
  const id = useId()
  const voiceId = `${id}-voice`
  const statusId = `${id}-status`

  useEffect(() => {
    const refresh = () => setStatus(getVoiceStatus())
    const off = subscribeVoices(refresh)
    refresh()
    return off
  }, [])

  const selected = selectGuidanceVoice(status.voices, s.voiceURI)
  const missing = !!s.voiceURI && !status.voices.some((v) => v.voiceURI === s.voiceURI)
  const quiet = s.mute
    ? 'Muted. Turn off Mute all sound above to hear guidance.'
    : !s.voice
      ? 'Spoken guidance is off. Turn it on to hear a preview.'
      : s.volume <= 0
        ? 'Volume is zero. Raise it above to hear guidance.'
        : null
  const availability = !status.supported
    ? 'Spoken guidance is unavailable in this browser.'
    : missing
      ? `Your saved voice is unavailable. ${selected ? `Using ${selected.name} on this device for now.` : 'No local voice is available; guidance stays silent.'}`
      : !selected
        ? 'No local voice is available yet. Guidance stays silent unless you choose a remote service voice.'
        : `${selected.name} · ${selected.localService ? 'reported as local by your browser' : 'remote service'}.`

  return (
    <div className="voice-settings">
      <div className="field toggle">
        <input
          id={id}
          type="checkbox"
          checked={s.voice}
          aria-describedby={statusId}
          onChange={(e) => updateSettings({ voice: e.target.checked })}
        />
        <label htmlFor={id}>
          Spoken guidance
          <span className="muted">Read brief breathing and rest cues aloud.</span>
        </label>
      </div>
      <div className="voice-controls field">
        <label htmlFor={voiceId}>Guidance voice</label>
        <select
          id={voiceId}
          value={s.voiceURI}
          disabled={!status.supported}
          aria-describedby={statusId}
          onChange={(e) => {
            stopSpeaking()
            updateSettings({ voiceURI: e.target.value })
          }}
        >
          <option value="">Automatic · local voices only</option>
          {missing && <option value={s.voiceURI}>Saved voice · unavailable</option>}
          {status.voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} · {v.lang} · {v.localService ? 'local' : 'remote service'}
            </option>
          ))}
        </select>
        <div>
          <Button
            variant="secondary"
            disabled={!!quiet || !selected || !status.supported}
            onClick={() =>
              say('Take a comfortable breath. Let your shoulders relax, and return when you are ready.')
            }
          >
            Preview voice
          </Button>
        </div>
      </div>
      <div id={statusId} className="voice-status muted" aria-live="polite">
        {quiet && <p>{quiet}</p>}
        <p>{availability}</p>
        {status.error && <p>{status.error}</p>}
      </div>
      <p className="voice-quality muted">
        Naturalness varies by browser and device. Preview to find a voice you like. Local availability does
        not guarantee offline playback. Remote voices may send cue text to the browser’s voice provider.
      </p>
    </div>
  )
}
