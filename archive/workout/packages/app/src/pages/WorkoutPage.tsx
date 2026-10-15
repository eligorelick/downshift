import type { CoachView, Goal } from '@downshift/core'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { RestRing, fmtClock } from '../components/RestRing'
import { Segmented } from '../components/Segmented'
import { refocusSoon, useStageFocus } from '../components/useStageFocus'
import { askNotifyPermission } from '../platform/notifyPermission'
import {
  acceptSuggestion,
  coachView,
  currentSetStart,
  dismissSuggestion,
  finishWorkout,
  resetWorkout,
  setDone,
  startNextSet,
  startWorkout,
  useWorkout,
} from '../sessions/workoutSession'
import { now, useNow } from '../state/clock'
import { useHeartRate } from '../state/hrStore'
import { updateSettings, useSettings } from '../state/settingsStore'
import '../styles/workout.css'

const GOALS: ReadonlyArray<{ value: Goal; label: string; why: string }> = [
  {
    value: 'strength',
    label: 'Strength',
    why: 'Rests over about 2 minutes seem needed to maximize strength gains in trained lifters.',
  },
  {
    value: 'hypertrophy',
    label: 'Muscle size',
    why: 'At least 60–90 s; little extra gain past about 90 s. For big compound lifts, 2–3 min is a reasonable starting point.',
  },
  {
    value: 'endurance',
    label: 'Endurance',
    why: 'Short rests of 30–60 s, within the usual 20–60 s convention; not trial-tested.',
  },
]

function minSec(sec: number): string {
  return fmtClock(sec * 1000)
}

function Setup() {
  const s = useSettings()
  const [compound, setCompound] = useState(true)
  const goal = GOALS.find((g) => g.value === s.goal) ?? (GOALS[1] as (typeof GOALS)[number])
  const f = s.restFloorSec
  const floor =
    goal.value === 'strength'
      ? f.strength
      : goal.value === 'endurance'
        ? f.endurance
        : compound
          ? f.hypertrophy
          : f.hypertrophyIsolation
  return (
    <>
      <Card title="Goal">
        <Segmented
          label="Training goal"
          value={s.goal}
          options={GOALS.map((g) => ({ value: g.value, label: g.label }))}
          onChange={(g) => updateSettings({ goal: g })}
        />
        <p>{goal.why}</p>
        <p className="wk-floor">
          Minimum rest <strong className="num">{minSec(floor)}</strong>
        </p>
        {goal.value === 'hypertrophy' && (
          <label className="wk-toggle">
            <input type="checkbox" checked={compound} onChange={(e) => setCompound(e.target.checked)} />
            <span>Compound lift (squat, bench, row)</span>
          </label>
        )}
      </Card>
      <p className="muted">
        Wrist sensors tend to read low while lifting. A chest strap is the safest choice.
      </p>
      <Button
        size="lg"
        block
        onClick={() => {
          askNotifyPermission()
          // The compound choice is only shown, and only means something, for muscle size.
          startWorkout(s.goal, s.goal === 'hypertrophy' ? compound : true)
        }}
      >
        Start workout
      </Button>
    </>
  )
}

function adviceText(v: CoachView): string {
  switch (v.advice) {
    case 'counting':
      return `Resting, ${fmtClock(v.floorMs - v.elapsedMs + 999)} to your minimum`
    case 'ready':
      return 'Ready when you are'
    case 'hr-high':
      return 'Heart rate is still above your pre-set level. Take a little longer if you like.'
    case 'hr-unreliable':
      return 'Ready when you are. (Heart rate unreliable this rest.)'
  }
}

// Static labels for screen readers; the visible text changes every second and would flood a live region.
const ADVICE_LABEL: Record<CoachView['advice'], string> = {
  counting: 'Resting',
  ready: 'Ready',
  'hr-high': 'Heart rate above your pre-set level',
  'hr-unreliable': 'Ready, heart rate unreliable',
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="wk-stat">
      <span className="wk-val num">{value}</span>
      <span className="wk-lab">{label}</span>
    </div>
  )
}

// Two taps, away from the big buttons, so a sweaty thumb cannot end the workout.
function FinishBar() {
  const [asking, setAsking] = useState(false)
  // Focus follows the swap, so a keyboard user lands on the choice and back on the button after Keep going.
  const [asked, setAsked] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (asking) box.current?.scrollIntoView({ block: 'center' })
  }, [asking])
  if (!asking) {
    return (
      <Button variant="ghost" autoFocus={asked} onClick={() => setAsking(true)}>
        Finish workout
      </Button>
    )
  }
  return (
    <div className="wk-confirm" ref={box} role="alertdialog" aria-label="Finish workout?">
      <p>Finish this workout? Your sets so far will be saved to History.</p>
      <div className="row">
        <Button
          variant="secondary"
          autoFocus
          onClick={() => {
            setAsked(true)
            setAsking(false)
          }}
        >
          Keep going
        </Button>
        <Button onClick={finishWorkout}>Yes, finish</Button>
      </div>
    </div>
  )
}

function Active() {
  // Never older than now, so the first frame after Set done or Start set does not read a stale tick.
  const t = Math.max(useNow(250), now())
  const s = useSettings()
  const hr = useHeartRate()
  const v = coachView(t)
  // The big button stays focused as it turns from Set done into Start set; on a short screen the new
  // layout can push it under the tab bar, so bring it back into view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the phase changes only
  useEffect(() => {
    const el = document.activeElement
    if (el instanceof HTMLElement && el.classList.contains('wk-giant'))
      el.scrollIntoView({ block: 'nearest' })
  }, [v.phase])
  const bpm = hr.state === 'connected' && v.bpm !== null ? v.bpm : '--'

  if (v.phase === 'set') {
    return (
      <>
        <div className="wk-stats">
          <Stat value={v.setNumber} label="set" />
          <Stat value={bpm} label="bpm" />
          <Stat value={fmtClock(t - currentSetStart())} label="set time" />
        </div>
        {/* No banner on this page, so this region is the only cue; it exists before the question appears so a
            screen reader announces it. */}
        <div aria-live="polite">
          {v.suggestRest && (
            <div className="wk-toast">
              <strong>Looks like you finished a set?</strong>
              <div className="row">
                <Button
                  onClick={() => {
                    acceptSuggestion()
                    refocusSoon()
                  }}
                >
                  Yes, start rest
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    dismissSuggestion()
                    refocusSoon()
                  }}
                >
                  No
                </Button>
              </div>
            </div>
          )}
        </div>
        <button type="button" className="wk-giant wk-done" data-stage-focus onClick={setDone}>
          Set done
        </button>
        <FinishBar />
      </>
    )
  }

  return (
    <>
      <div className="wk-stats">
        <Stat value={v.setNumber} label={v.setNumber === 1 ? 'set done' : 'sets done'} />
        <Stat value={bpm} label="bpm" />
        <Stat value={v.preSetBpm !== null ? Math.round(v.preSetBpm) : '--'} label="before set" />
      </div>
      <div className="wk-rest" data-advice={v.advice}>
        <RestRing elapsedMs={v.elapsedMs} floorMs={v.floorMs} capMs={v.capMs} advice={v.advice} />
        <p className="wk-advice">{adviceText(v)}</p>
        <output className="sr-only">{ADVICE_LABEL[v.advice]}</output>
        {s.breathingBetweenSets && <p className="muted">Easy breaths through your nose</p>}
      </div>
      <button
        type="button"
        className="wk-giant wk-start"
        data-stage-focus
        data-ready={
          v.advice === 'ready' || v.advice === 'hr-unreliable'
            ? 'yes'
            : v.advice === 'hr-high'
              ? 'soon'
              : 'no'
        }
        onClick={startNextSet}
      >
        Start set
      </button>
      <FinishBar />
    </>
  )
}

function Summary({ summary }: { summary: NonNullable<ReturnType<typeof useWorkout>['summary']> }) {
  return (
    <>
      <Card title="Workout complete">
        <div className="wk-stats">
          <Stat value={summary.sets} label={summary.sets === 1 ? 'set' : 'sets'} />
          <Stat
            value={summary.avgRestSec === null ? '--' : minSec(Math.round(summary.avgRestSec))}
            label="average rest"
          />
          <Stat
            value={summary.longestRestSec === null ? '--' : minSec(Math.round(summary.longestRestSec))}
            label="longest rest"
          />
        </div>
        {summary.records.length > 0 && (
          <table className="wk-table">
            <thead>
              <tr>
                <th scope="col">Set</th>
                <th scope="col">Time</th>
                <th scope="col">Rest after</th>
              </tr>
            </thead>
            <tbody>
              {summary.records.map((r) => (
                <tr key={r.n}>
                  <td className="num">{r.n}</td>
                  <td className="num">{fmtClock(r.setEnd - r.setStart)}</td>
                  <td className="num">{r.restEnd === null ? '--' : fmtClock(r.restEnd - r.setEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {summary.records.length > 0 && <p className="muted">Saved to History.</p>}
      </Card>
      <Button size="lg" block onClick={resetWorkout}>
        New workout
      </Button>
    </>
  )
}

export function WorkoutPage() {
  const { stage, summary } = useWorkout()
  useStageFocus(stage)
  return (
    <div className="page wk-page">
      {stage === 'setup' && (
        <header className="page-head">
          <h1>Workout</h1>
          <p>A rest timer with a minimum that fits your goal.</p>
        </header>
      )}
      {stage === 'setup' && <Setup />}
      {stage === 'active' && <Active />}
      {stage === 'summary' && summary && <Summary summary={summary} />}
    </div>
  )
}
