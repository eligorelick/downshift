import { PATTERNS, type PatternKey, breathAt, findPattern, getPattern } from '@downshift/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Pacer } from '../components/Pacer'
import { RatingScale } from '../components/RatingScale'
import { Segmented } from '../components/Segmented'
import { TechniqueGuide } from '../components/TechniqueGuide'
import { refocusSoon, useStageFocus } from '../components/useStageFocus'
import { stopSpeaking } from '../platform/speech'
import { acquireWakeLock, releaseWakeLock } from '../platform/wakeLock'
import {
  type BreatheSource,
  type Session,
  beginSession,
  cue,
  elapsedSec,
  pauseSession,
  resumeSession,
  saveSession,
  setBreathing,
  summaryText,
  unlockAudio,
} from '../sessions/breathSession'
import { now } from '../state/clock'
import { useRoute } from '../state/route'
import { updateSettings, useSettings } from '../state/settingsStore'
import '../styles/breathe.css'

type Stage = 'setup' | 'run' | 'after' | 'saved'

const SHORT_NAMES: Record<PatternKey, string> = {
  slow46: '4 in, 6 out',
  slow55: '5 in, 5 out',
  sigh: 'Sighing',
  box: 'Box',
}

function parseSource(v: string | null): BreatheSource {
  return v === 'nudge' || v === 'break' ? v : 'manual'
}

function useReducedMotion(): boolean {
  const [r, setR] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setR(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return r
}

// A quarter-second tick keeps cues and the end on time; the pacer animates itself between ticks.
function useTick(active: boolean): number {
  const [t, setT] = useState(now)
  useEffect(() => {
    if (!active) return
    const tick = () => setT(now())
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    tick()
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active])
  return t
}

function mmss(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

interface FlowProps {
  source: BreatheSource
  pattern0: PatternKey
  minutes0: 2 | 5
  tense0: number | null
}

function Flow({ source: source0, pattern0, minutes0, tense0 }: FlowProps) {
  // Fixed for this request: tapping the Breathe tab mid-session changes the URL but not what is running.
  const [source, setSource] = useState(source0)
  // The request's details are read once; clear them from the address so a reload, restored tab or Back
  // does not replay an old nudge or break (its source and tension rating) as a new one.
  useEffect(() => {
    if (location.hash.startsWith('#breathe?')) history.replaceState(null, '', '#breathe')
  }, [])
  const settings = useSettings()
  const reduced = useReducedMotion()
  const [stage, setStage] = useState<Stage>('setup')
  const [patternKey, setPatternKey] = useState<PatternKey>(pattern0)
  const [minutes, setMinutes] = useState<2 | 5>(minutes0)
  const [before, setBefore] = useState<number | null>(tense0)
  const [after, setAfter] = useState<number | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [doneSec, setDoneSec] = useState(0)
  const [saving, setSaving] = useState(false)
  const lastStep = useRef('')

  const pattern = getPattern(patternKey)
  const totalSec = minutes * 60
  const t = useTick(stage === 'run')
  useStageFocus(stage)
  // The run starts from wherever Begin was scrolled to; bring the orb and its controls into view together.
  useEffect(() => {
    if (stage !== 'run') return
    document.querySelector('.pacer-card')?.scrollIntoView({ block: 'start' })
    // If the card is still taller than the space, Pause/Stop win over the top of the orb.
    document.querySelector('.breathe-actions')?.scrollIntoView({ block: 'nearest' })
  }, [stage])
  // The tick can be up to 250 ms older than a Resume, which would step elapsed time back into the previous
  // breath and replay its cue; never read a time earlier than now.
  const el = session ? elapsedSec(session, Math.max(t, now())) : 0
  const paused = session?.pausedAt != null
  const sessionRef = useRef<Session | null>(null)
  sessionRef.current = session
  const getElapsed = useCallback(() => (sessionRef.current ? elapsedSec(sessionRef.current) : 0), [])

  useEffect(() => {
    if (stage !== 'run') return
    setBreathing(true)
    void acquireWakeLock('breathe')
    return () => {
      setBreathing(false)
      void releaseWakeLock('breathe')
      stopSpeaking()
    }
  }, [stage])

  // Each step start fires its tone and voice once. Paused time does not advance, so nothing repeats.
  useEffect(() => {
    if (stage !== 'run' || !session || paused) return
    if (el >= totalSec) {
      setDoneSec(totalSec)
      setStage('after')
      return
    }
    const ph = breathAt(pattern, el)
    const id = `${ph.cycle}:${ph.index}`
    if (id !== lastStep.current) {
      lastStep.current = id
      cue(ph.step, ph.cycle)
    }
  }, [stage, session, paused, el, totalSec, pattern])

  const begin = () => {
    unlockAudio()
    if (!settings.tutorialDone) updateSettings({ tutorialDone: true })
    lastStep.current = ''
    savedRef.current = false
    setSession(beginSession())
    setStage('run')
  }

  const stop = () => {
    const done = Math.min(totalSec, Math.round(el))
    // Stopping before half a second has passed (it rounds to zero) is not a session.
    if (done <= 0) {
      setStage('setup')
      return
    }
    setDoneSec(done)
    setStage('after')
  }

  // Leaving mid-session or before Done must not lose the breaths already taken. savedRef is the
  // double-save guard shared by Done and the unmount save.
  const latest = useRef({ stage, patternKey, totalSec, doneSec, before, after, source })
  latest.current = { stage, patternKey, totalSec, doneSec, before, after, source }
  const savedRef = useRef(false)
  const savingRef = useRef(false)

  useEffect(
    () => () => {
      const l = latest.current
      if (savedRef.current || savingRef.current) return
      const done =
        l.stage === 'after'
          ? l.doneSec
          : l.stage === 'run' && sessionRef.current
            ? Math.min(l.totalSec, Math.round(elapsedSec(sessionRef.current)))
            : 0
      if (done <= 0) return
      savedRef.current = true
      void saveSession({
        pattern: l.patternKey,
        plannedSec: l.totalSec,
        doneSec: done,
        before: l.before,
        after: l.stage === 'after' ? l.after : null,
        source: l.source,
        startedAt: sessionRef.current?.startedAt ?? now(),
      })
    },
    [],
  )

  const save = async () => {
    if (saving || savingRef.current || savedRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      await saveSession({
        pattern: patternKey,
        plannedSec: totalSec,
        doneSec,
        before,
        after,
        source,
        startedAt: session?.startedAt ?? now(),
      })
      savedRef.current = true
      setStage('saved')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const choose = (p: PatternKey, m: 2 | 5) => {
    setPatternKey(p)
    setMinutes(m)
    updateSettings({ pattern: p, breathMinutes: m })
  }

  if (stage === 'run' && session) {
    return (
      <Card>
        <div className="pacer-card">
          <Pacer
            pattern={pattern}
            elapsedSec={el}
            getElapsed={getElapsed}
            totalSec={totalSec}
            reducedMotion={reduced}
          />
        </div>
        <div className="breathe-actions">
          <Button
            variant="secondary"
            data-stage-focus
            onClick={() => setSession(paused ? resumeSession(session) : pauseSession(session))}
          >
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="ghost" onClick={stop}>
            Stop
          </Button>
        </div>
      </Card>
    )
  }

  if (stage === 'after') {
    return (
      <Card title="Finished">
        <p className="muted" data-stage-focus>
          You breathed for <span className="num">{mmss(doneSec)}</span>. Rating is optional.
        </p>
        <RatingScale value={after} onChange={setAfter} legend="How tense do you feel now?" />
        <div className="row">
          <Button disabled={saving} onClick={() => void save()}>
            Done
          </Button>
        </div>
      </Card>
    )
  }

  if (stage === 'saved') {
    return (
      <Card>
        <output className="breathe-result" data-stage-focus>
          {summaryText(before, after)}
        </output>
        <div className="row">
          <Button
            onClick={() => {
              setBefore(null)
              setAfter(null)
              // A second round is the person's own choice, not the nudge or break that opened the page.
              setSource('manual')
              setStage('setup')
            }}
          >
            Breathe again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <>
      {!settings.tutorialDone && (
        <Card title="Before you start">
          <ul className="breathe-intro">
            <li>
              The aim is slower, not deeper. In one small study, 6 of 16 beginners over-breathed on their
              first try.
            </li>
            <li>
              Breathe in through your nose if you can; breathe out through your nose or mouth, whichever is
              comfortable.
            </li>
            <li>It's fine to lose count. Just pick the rhythm up again.</li>
          </ul>
          <div className="row">
            <Button
              variant="secondary"
              onClick={() => {
                updateSettings({ tutorialDone: true })
                refocusSoon()
              }}
            >
              Got it
            </Button>
          </div>
        </Card>
      )}
      <TechniqueGuide pattern={patternKey} minutes={minutes} onChoose={choose} />
      <Card title="Your session">
        <div className="breathe-opts">
          <Segmented
            label="Pattern"
            value={patternKey}
            options={PATTERNS.map((p) => ({ value: p.key, label: SHORT_NAMES[p.key] }))}
            onChange={(p) => choose(p, minutes)}
          />
          <p className="pattern-note">{pattern.note}</p>
          <Segmented
            label="Length"
            value={String(minutes) as '2' | '5'}
            options={[
              { value: '2', label: '2 minutes' },
              { value: '5', label: '5 minutes' },
            ]}
            onChange={(v) => choose(patternKey, v === '2' ? 2 : 5)}
          />
        </div>
        <RatingScale value={before} onChange={setBefore} legend="How tense do you feel? (optional)" />
        <div className="row">
          <Button size="lg" onClick={begin}>
            Begin
          </Button>
        </div>
      </Card>
    </>
  )
}

export function BreathePage() {
  const { params } = useRoute()
  // A new request (from Home, a break or a nudge) starts the flow afresh; the bare tab link keeps it.
  const n = params.get('n')
  const flowKey = useRef('page')
  if (n && n !== flowKey.current) flowKey.current = n
  const s = useSettings()
  const p = params.get('pattern')
  const m = params.get('minutes')
  const pattern0 = (p && findPattern(p)?.key) || s.pattern
  const minutes0: 2 | 5 = m === '2' ? 2 : m === '5' ? 5 : s.breathMinutes
  const t = Number(params.get('tense'))
  const tense0 = t >= 1 && t <= 5 ? Math.round(t) : null
  return (
    <div className="page">
      <header className="page-head">
        <h1>Breathe</h1>
        <p>A few slow breaths to settle down.</p>
      </header>
      <Flow
        key={flowKey.current}
        source={parseSource(params.get('source'))}
        pattern0={pattern0}
        minutes0={minutes0}
        tense0={tense0}
      />
    </div>
  )
}
