import { useState } from 'react'
import { askNotifyPermission } from '../platform/notifyPermission'
import {
  type CompanionView,
  answerPrompt,
  resumeCompanion,
  snoozeCompanion,
  startCompanion,
  stopCompanion,
  useFocus,
} from '../sessions/focusSession'
import { useSettings } from '../state/settingsStore'
import { Button } from './Button'
import { NudgePrompt } from './NudgePrompt'
import { refocusSoon } from './useStageFocus'
import '../styles/companion.css'

const STATUS: Record<CompanionView['status'], string> = {
  stopped: 'Companion stopped',
  snoozed: 'Snoozed',
  workout: 'Paused during workout',
  breathing: 'Paused during breathing',
  break: 'Paused during your break',
  waiting: 'Waiting for a heart rate device',
  lost: 'Signal lost',
  contact: 'Check sensor contact',
  learning: 'Learning your baseline',
  watching: 'Watching your heart rate',
}

function act(action: () => void): void {
  action()
  refocusSoon()
}

export function CompanionPanel() {
  const { companion: v, prompt } = useFocus()
  const s = useSettings()
  const [notifyAsked, setNotifyAsked] = useState(false)
  const canNotify = typeof Notification !== 'undefined' && Notification.permission === 'default'

  return (
    <section className="companion" aria-labelledby="companion-title">
      <div className="companion-head">
        <div>
          <p className="companion-kicker">While you work or study</p>
          <h2 id="companion-title" tabIndex={-1} data-stage-focus>
            Heart rate companion
          </h2>
        </div>
        <div className="companion-actions">
          {!v.enabled ? (
            <Button onClick={() => act(startCompanion)}>Start companion</Button>
          ) : (
            <>
              {v.status === 'snoozed' ? (
                <Button variant="secondary" onClick={() => act(resumeCompanion)}>
                  Resume companion
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => act(snoozeCompanion)}>
                  Snooze 15 minutes
                </Button>
              )}
              <Button variant="ghost" onClick={() => act(stopCompanion)}>
                Stop companion
              </Button>
            </>
          )}
        </div>
      </div>
      <output className="companion-status">
        <span>{STATUS[v.status]}</span>
        {v.demo && <span> · Demo data</span>}
      </output>
      <p className="companion-description">
        Leave it on while you work or study, without a timed block. Sustained heart rate changes invite a
        check-in; you choose what to do. This is a cue, not a stress or focus score.
      </p>
      {(v.status === 'waiting' || v.status === 'lost' || v.status === 'contact') && (
        <p className="muted">
          {v.status === 'contact'
            ? 'Adjust your sensor. '
            : v.status === 'lost'
              ? 'Check the connection. '
              : ''}
          <a href="#device">Open Device to connect or try demo data.</a> Learning restarts when usable
          readings return.
        </p>
      )}
      {v.status === 'snoozed' && (
        <p className="muted">
          Until {new Date(v.snoozedUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
          Then it learns again before any routine check-in.
        </p>
      )}
      {(v.status === 'learning' || v.status === 'watching') && (
        <>
          <dl className="companion-measures">
            <div>
              <dt>Completed minute</dt>
              <dd className="num">{v.minuteBpm === null ? '—' : `${Math.round(v.minuteBpm)} bpm`}</dd>
            </div>
            <div>
              <dt>Earlier baseline</dt>
              <dd className="num">{v.baseline === null ? 'Learning' : `${v.baseline} bpm`}</dd>
            </div>
          </dl>
          <p className="muted small">
            {v.minuteAt === null
              ? 'Waiting for a full usable minute.'
              : `Minute ending ${new Date(v.minuteAt + 60_000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`}{' '}
            {v.baselineMinutes} usable earlier {v.baselineMinutes === 1 ? 'minute' : 'minutes'}.
            {v.baseline === null && ' At least five are needed; pauses and gaps extend learning.'}
          </p>
        </>
      )}
      <div className="fc-live" aria-live="polite">
        {prompt && (
          <NudgePrompt
            key={prompt.shownAt}
            info={prompt}
            onAnswer={(answer, rating) => {
              answerPrompt(answer, rating)
              refocusSoon()
            }}
          />
        )}
      </div>
      <details className="companion-details">
        <summary>How check-ins work</summary>
        <p>
          Routine check-ins use minute medians and a lagged baseline of up to 30 usable earlier minutes. The
          newest {Math.max(5, s.nudgeMinutes)} minutes stay out of that baseline. The first five minutes after
          starting or a signal reset are settling time.
        </p>
        <p>
          A rise of {s.nudgeDelta} bpm for {s.nudgeMinutes} minutes is a starting-point rule, not a validated
          stress or focus threshold. Routine check-ins are limited to one every {s.waitMin} minutes and{' '}
          {s.dailyCap} a day. A sustained high-heart-rate check-in has a separate hourly limit.
        </p>
        <p>
          Monitoring pauses during Workout, breathing and timed breaks. Snooze lasts 15 minutes; Stop clears
          pending check-ins. No Focus blocks are logged by the companion.{' '}
          <a href="#evidence">Read the evidence.</a>
        </p>
      </details>
      <p className="companion-foot muted small">
        Keep the app open; background tabs may pause. Optional sound in <a href="#settings">Settings</a>.
      </p>
      {v.enabled && canNotify && !notifyAsked && (
        <Button
          variant="ghost"
          onClick={() => {
            askNotifyPermission()
            setNotifyAsked(true)
          }}
        >
          Enable notifications
        </Button>
      )}
    </section>
  )
}
