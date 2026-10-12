import { dayKey, duration } from '@downshift/core'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { refocusSoon } from '../components/useStageFocus'
import { askNotifyPermission } from '../platform/notifyPermission'
import { startBreathe } from '../sessions/breathSession'
import { useNow } from '../state/clock'
import { useHeartRate, useLiveBpm } from '../state/hrStore'
import { updateSettings, useSettings } from '../state/settingsStore'
import '../styles/home.css'

const STATE_TEXT: Record<string, string> = {
  connected: 'Device connected',
  disconnected: 'No device connected',
  requesting: 'Choosing a device',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  unsupported: 'Bluetooth unavailable here',
  error: 'Device problem',
}

function go(hash: string): void {
  location.hash = hash
}

export function HomePage() {
  const s = useSettings()
  const hr = useHeartRate()
  // Re-rendered each minute so a page left open past midnight stops showing yesterday's counts.
  const key = dayKey(new Date(useNow(60_000)))
  const today = s.today.key === key ? s.today : { focusBlocks: 0, breaths: 0, focusMs: 0, sets: 0 }
  const liveBpm = useLiveBpm()
  const live = liveBpm !== null

  return (
    <div className="page home">
      <header className="page-head">
        <h1>Downshift</h1>
        <p>A calm place to start.</p>
      </header>

      {!s.welcomed && (
        <section className="card welcome" aria-labelledby="welcome-h">
          <h2 id="welcome-h">Welcome to Downshift</h2>
          <p>
            Downshift has three modes. <strong>Focus</strong> times study or work blocks and breaks.{' '}
            <strong>Workout</strong> times your rest between sets. <strong>Breathe</strong> paces slow
            breathing. A heart rate device is optional.
          </p>
          <ul>
            <li>It is not a medical device. It cannot diagnose stress or any condition.</li>
            <li>
              Your data stays on this device. There is no account, and nothing you do is sent to a server.
            </li>
          </ul>
          <div>
            <Button
              onClick={() => {
                updateSettings({ welcomed: true })
                refocusSoon()
              }}
            >
              Got it
            </Button>
          </div>
        </section>
      )}

      <a className="home-hr card" href="#device">
        <span className="hr-hero">
          <span
            className="big num"
            role="img"
            aria-label={live ? `${hr.bpm} beats per minute` : 'No reading'}
          >
            {live ? hr.bpm : '--'}
          </span>
          <span className="unit">bpm</span>
        </span>
        <span className="muted">
          {hr.state === 'connected' && hr.kind === 'simulated'
            ? 'Demo data'
            : (STATE_TEXT[hr.state] ?? hr.state)}
        </span>
      </a>

      <div className="mode-grid">
        <Card title="Focus">
          <p className="muted">Work in blocks with planned breaks.</p>
          <p className="caveat">
            Breaks reduce fatigue. There's no evidence yet that a break schedule raises grades.
          </p>
          <Button
            onClick={() => {
              // Asked here, during the click, because the Focus page starts the session on arrival.
              askNotifyPermission()
              go('#focus?start=1')
            }}
          >
            Start focusing
          </Button>
        </Card>
        <Card title="Workout">
          <p className="muted">A rest timer for the gap between sets.</p>
          <p className="caveat">
            Rest times are group averages; heart rate cannot say your muscles have recovered.
          </p>
          <Button onClick={() => go('#workout')}>Open workout</Button>
        </Card>
        <Card title="Breathe">
          <p className="muted">Slow, paced breathing. Six breaths a minute by default.</p>
          <p className="caveat">
            May lower how tense you feel for a while; not reliably shown to improve performance.
          </p>
          <Button onClick={() => startBreathe({ source: 'manual' })}>Start breathing</Button>
        </Card>
      </div>

      <Card title="Today">
        <dl className="tally">
          <div>
            <dt>Focus blocks</dt>
            <dd className="num">{today.focusBlocks}</dd>
          </div>
          <div>
            <dt>Time worked</dt>
            <dd className="num">{duration(today.focusMs)}</dd>
          </div>
          <div>
            <dt>Sets</dt>
            <dd className="num">{today.sets}</dd>
          </div>
          <div>
            <dt>Breathing sessions</dt>
            <dd className="num">{today.breaths}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
