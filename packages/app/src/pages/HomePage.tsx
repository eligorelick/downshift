import { dayKey, duration } from '@downshift/core'
import { Button } from '../components/Button'
import { CompanionPanel } from '../components/CompanionPanel'
import { Icon } from '../components/Icon'
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
      <header className="home-head">
        <div className="page-head">
          <h1>Downshift</h1>
          <p>A calm place to start.</p>
        </div>
        <a className="home-hr" href="#device">
          <Icon name="device" />
          <span className="home-reading">
            <span role="img" aria-label={live ? `${hr.bpm} beats per minute` : 'No reading'}>
              <span className="num">{live ? hr.bpm : '--'}</span> bpm
            </span>
            <span className="muted">
              {hr.state === 'connected' && hr.kind === 'simulated'
                ? 'Demo data'
                : (STATE_TEXT[hr.state] ?? hr.state)}
            </span>
          </span>
        </a>
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

      <CompanionPanel />

      <div className="mode-list">
        <section className="mode-row" aria-labelledby="mode-focus">
          <span className="mode-icon">
            <Icon name="focus" size={52} />
          </span>
          <div className="mode-copy">
            <h2 id="mode-focus">Focus</h2>
            <p>Work in blocks with planned breaks.</p>
            <p className="caveat">
              <Icon name="evidence" size={18} />
              <span>Breaks reduce fatigue. There's no evidence yet that a break schedule raises grades.</span>
            </p>
          </div>
          <Button
            onClick={() => {
              // Asked here, during the click, because the Focus page starts the session on arrival.
              askNotifyPermission()
              go('#focus?start=1')
            }}
          >
            Start focusing
            <Icon name="arrow" size={20} />
          </Button>
        </section>
        <section className="mode-row" aria-labelledby="mode-workout">
          <span className="mode-icon">
            <Icon name="workout" size={52} />
          </span>
          <div className="mode-copy">
            <h2 id="mode-workout">Workout</h2>
            <p>A rest timer for the gap between sets.</p>
            <p className="caveat">
              <Icon name="evidence" size={18} />
              <span>Rest times are group averages; heart rate cannot say your muscles have recovered.</span>
            </p>
          </div>
          <Button onClick={() => go('#workout')}>
            Open workout <Icon name="arrow" size={20} />
          </Button>
        </section>
        <section className="mode-row" aria-labelledby="mode-breathe">
          <span className="mode-icon">
            <Icon name="breathe" size={52} />
          </span>
          <div className="mode-copy">
            <h2 id="mode-breathe">Breathe</h2>
            <p>Slow, paced breathing. Six breaths a minute by default.</p>
            <p className="caveat">
              <Icon name="evidence" size={18} />
              <span>
                May lower how tense you feel for a while; not reliably shown to improve performance.
              </span>
            </p>
          </div>
          <Button onClick={() => startBreathe({ source: 'manual' })}>
            Start breathing <Icon name="arrow" size={20} />
          </Button>
        </section>
      </div>

      <section className="home-today" aria-labelledby="today-h">
        <h2 id="today-h">Today</h2>
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
      </section>
    </div>
  )
}
