import { PRESETS, type PresetKey, dayKey, minutesPhrase } from '@downshift/core'
import { useEffect, useRef } from 'react'
import { BreakPanel } from '../components/BreakPanel'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { NudgePrompt } from '../components/NudgePrompt'
import { Segmented } from '../components/Segmented'
import { SharpnessPrompt } from '../components/SharpnessPrompt'
import { fmtClock } from '../components/formatClock'
import { refocusSoon, useStageFocus } from '../components/useStageFocus'
import { askNotifyPermission } from '../platform/notifyPermission'
import {
  type FocusView,
  answerPrompt,
  answerSharpness,
  endFocus,
  extendBreak,
  focusTimes,
  lastSummary,
  nextBlock,
  setNote,
  skipSharpness,
  snoozeBreak,
  startBreak,
  startFocus,
  useFocus,
} from '../sessions/focusSession'
import { now, useNow } from '../state/clock'
import { useHeartRate } from '../state/hrStore'
import { useRoute } from '../state/route'
import { updateSettings, useSettings } from '../state/settingsStore'
import '../styles/focus.css'

const LOST_AFTER_MS = 15_000

function minutes(ms: number): string {
  const m = Math.round(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`
}

function Setup() {
  const s = useSettings()
  const preset = PRESETS[s.preset]
  const [lo, hi] = preset.blockMinRange
  const block = s.blockMin[s.preset]
  const sum = lastSummary()
  // The stored tally is only rolled over when something is added, so yesterday's must not show as today's.
  const today = s.today.key === dayKey(new Date(now())) ? s.today : null
  return (
    <>
      <Card title="Session">
        <Segmented<PresetKey>
          label="Preset"
          value={s.preset}
          options={Object.values(PRESETS).map((p) => ({ value: p.key, label: p.name }))}
          onChange={(p) => updateSettings({ preset: p })}
        />
        <label className="fc-slider">
          <span>
            Block length <strong className="num">{block} min</strong>
          </span>
          {/* Named on its own, so the value and range ticks inside the label are not read as part of the name. */}
          <input
            type="range"
            min={lo}
            max={hi}
            step={1}
            value={block}
            aria-label="Block length"
            aria-valuetext={`${block} minutes`}
            onChange={(e) =>
              updateSettings({ blockMin: { ...s.blockMin, [s.preset]: Number(e.target.value) } })
            }
          />
          <span className="fc-range muted">
            <span className="num">{lo}</span>
            <span className="num">{hi}</span>
          </span>
        </label>
        <p className="muted">
          Then {minutesPhrase(preset.shortBreakMin(block))} break, and {preset.longBreakMin} minutes at the
          end of the first block that brings you to {preset.longAfterWorkedMin} minutes or more of work.
          {s.preset === 'school' && block === 25
            ? ' With 25-minute blocks that is after four blocks, about two hours with breaks.'
            : ''}
        </p>
      </Card>
      {sum.saved && (
        <output className="muted fc-block">
          Last session: {sum.blocks} {sum.blocks === 1 ? 'block' : 'blocks'}, {minutes(sum.workedMs)} worked.
          Saved to History.
        </output>
      )}
      {today && today.focusBlocks > 0 && (
        <p className="muted">
          Today: {today.focusBlocks} {today.focusBlocks === 1 ? 'block' : 'blocks'}, {minutes(today.focusMs)}.
        </p>
      )}
      <Button
        size="lg"
        block
        onClick={() => {
          askNotifyPermission()
          startFocus()
        }}
      >
        {preset.words.startCta}
      </Button>
    </>
  )
}

function NoteField({ value }: { value: string }) {
  return (
    <label className="fc-note">
      <span>Where you're up to</span>
      <input
        type="text"
        value={value}
        maxLength={140}
        placeholder="The next step you'll take"
        onChange={(e) => setNote(e.target.value)}
      />
    </label>
  )
}

function HrLost() {
  const hr = useHeartRate()
  const t = useNow(1000)
  // No device in use: never connected, disconnected, or the chooser was canceled.
  if (hr.kind === null || hr.state === 'disconnected') return null
  // Connected but nothing received yet (some devices only send once worn, or once broadcast is on).
  if (hr.state === 'connected' && hr.lastAt === null) {
    return <output className="fc-lost">Waiting for the first heart rate reading. Timer keeps running.</output>
  }
  const stale = hr.state === 'connected' && hr.lastAt !== null && t - hr.lastAt > LOST_AFTER_MS
  if (hr.state === 'connected' && !stale) return null
  return <output className="fc-lost">No heart rate signal right now. Timer keeps running.</output>
}

function Work({ view, t }: { view: FocusView; t: number }) {
  // Never older than now: a tick up to 500 ms stale would show one minute too many right after "5 more minutes".
  const { remainingMs, workedMs } = focusTimes(Math.max(t, now()))
  const due = view.phase === 'breakDue'
  // After "5 more minutes" the heads-up shows with up to five minutes left, so say the real number.
  const minsLeft = Math.max(1, Math.ceil(remainingMs / 60_000))
  return (
    <>
      <Card>
        <p className="fc-kicker" data-stage-focus>
          Block <span className="num">{view.blockNumber}</span> · {view.preset.name}
        </p>
        <p className="fc-time num" aria-hidden="true">
          {fmtClock(remainingMs + 999)}
        </p>
        <output className="sr-only">{due ? 'Break due' : 'Focus block in progress'}</output>
        <p className="fc-total">
          Time worked <strong className="num">{fmtClock(workedMs)}</strong>
        </p>
        <HrLost />
        <Button variant="ghost" onClick={endFocus}>
          Stop
        </Button>
      </Card>
      {/* One card for "break soon" and "break due", so the note field stays mounted (and keeps focus while
          someone is typing) when one turns into the other. */}
      {(view.headsUp || due) && (
        <section className={due ? 'card fc-due' : 'card fc-heads'} aria-labelledby="fc-soon-title">
          <h2 id="fc-soon-title">
            {due
              ? view.breakIsLong
                ? 'Time for a long break'
                : `Time for ${minutesPhrase(view.breakMinutes)} break`
              : `Break in ${minsLeft} ${minsLeft === 1 ? 'minute' : 'minutes'}. Note where you're up to?`}
          </h2>
          <NoteField value={view.note} />
          {due && (
            <div className="row">
              <Button onClick={startBreak}>Start break</Button>
              {view.canSnooze && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    snoozeBreak()
                    refocusSoon()
                  }}
                >
                  5 more minutes
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </>
  )
}

function BackDue({ view }: { view: FocusView }) {
  return (
    <Card>
      <p className="fc-kicker" data-stage-focus>
        Break's over
      </p>
      <p className="user-text">
        {view.note ? `Pick up at: ${view.note}` : 'Start with the next step you had in mind.'}
      </p>
      <div className="row">
        <Button onClick={nextBlock}>Next block</Button>
        {view.canExtend && (
          <Button variant="secondary" onClick={extendBreak}>
            5 more minutes
          </Button>
        )}
        <Button variant="ghost" onClick={endFocus}>
          End session
        </Button>
      </div>
    </Card>
  )
}

export function FocusPage() {
  const view = useFocus()
  const t = useNow(500)
  const { params } = useRoute()
  const wantStart = params.get('start') === '1'
  const heading = useRef<HTMLHeadingElement>(null)
  useStageFocus(
    !view.active ? 'setup' : view.phase === 'break' || view.phase === 'backDue' ? view.phase : 'work',
  )
  // The card unmounts on Save or Skip, which would drop keyboard focus to the page; send it to the heading.
  const sharpnessDone = (): void => heading.current?.focus()

  // The desktop tray opens "#focus?start=1"; clear it so a reload does not start a second session.
  useEffect(() => {
    if (!wantStart) return
    startFocus()
    history.replaceState(null, '', '#focus')
  }, [wantStart])

  return (
    <div className="page fc-page">
      {!view.active && (
        <header className="page-head">
          <h1 ref={heading} tabIndex={-1}>
            Focus
          </h1>
          <p>Work in blocks, with planned breaks and an optional heart rate check-in.</p>
        </header>
      )}
      {/* The prompt is silent by default, so this region is how a screen reader learns it has appeared. */}
      <div className="fc-live" aria-live="polite">
        {view.prompt && (
          <NudgePrompt
            info={view.prompt}
            onAnswer={(answer, rating) => {
              answerPrompt(answer, rating)
              refocusSoon()
            }}
          />
        )}
      </div>
      {/* The live region exists before the card does, so a screen reader announces the question. */}
      <div className="fc-live" aria-live="polite">
        {!view.active && view.askSharpness && (
          <SharpnessPrompt
            onRate={(r) => {
              answerSharpness(r)
              sharpnessDone()
            }}
            onSkip={() => {
              skipSharpness()
              sharpnessDone()
            }}
          />
        )}
      </div>
      {!view.active && <Setup />}
      {view.active && (view.phase === 'work' || view.phase === 'breakDue') && <Work view={view} t={t} />}
      {view.active && view.phase === 'break' && (
        <BreakPanel view={view} remainingMs={focusTimes(Math.max(t, now())).remainingMs} onBack={nextBlock} />
      )}
      {view.active && view.phase === 'backDue' && <BackDue view={view} />}
    </div>
  )
}
