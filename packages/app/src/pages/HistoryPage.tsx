import { type Goal, type LogEvent, PATTERNS, PRESETS, defaultSettings, toCsv } from '@downshift/core'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Segmented } from '../components/Segmented'
import { SharpestHours } from '../components/SharpestHours'
import { rememberDevice } from '../platform/desktopBridge'
import { discardFocus } from '../sessions/focusSession'
import { discardWorkout } from '../sessions/workoutSession'
import { now } from '../state/clock'
import { disconnect } from '../state/hrStore'
import { all, clear, subscribe } from '../state/logStore'
import { updateSettings } from '../state/settingsStore'
import '../styles/history.css'

type Filter = 'all' | LogEvent['type']

const LABEL: Record<LogEvent['type'], string> = {
  breathe: 'Breathe',
  nudge: 'Nudge',
  focus: 'Focus',
  break: 'Break',
  set: 'Workout set',
}

// Stored keys shown as words; an unknown key (from a newer or older version) is shown as it is.
const patternName = (k: string): string => PATTERNS.find((p) => p.key === k)?.name ?? k
const presetName = (k: string): string =>
  (PRESETS as Record<string, { name: string } | undefined>)[k]?.name ?? k
const GOAL: Record<Goal, string> = {
  strength: 'Strength',
  hypertrophy: 'Muscle size',
  endurance: 'Endurance',
}
const SUGGESTION: Record<string, string> = { breathe: 'breathing', move: 'moving', rest: 'resting' }

const mins = (sec: number) => `${Math.max(1, Math.round(sec / 60))} min`

function detail(e: LogEvent): string {
  switch (e.type) {
    case 'breathe': {
      const t =
        e.tenseBefore !== null && e.tenseAfter !== null ? `, tension ${e.tenseBefore} to ${e.tenseAfter}` : ''
      return `${patternName(e.pattern)}, ${Math.round(e.doneSec)} of ${e.plannedSec} s${t}`
    }
    case 'nudge':
      return `${e.due === 'tense' ? 'Above baseline' : 'High'} at ${e.bpm} bpm${e.demo ? ' (demo)' : ''}, answer: ${e.answer ?? 'none'}`
    case 'focus':
      return `${presetName(e.preset)}, ${e.blocks} block${e.blocks === 1 ? '' : 's'}, ${mins(e.focusMs / 1000)} worked${typeof e.sharpness === 'number' ? `, sharpness ${e.sharpness} of 5` : ''}`
    case 'break':
      return `${typeof e.doneSec === 'number' ? `${e.doneSec < 60 ? `${e.doneSec} s` : mins(e.doneSec)} of ${e.minutes} min planned` : `${e.minutes} min`}${e.long ? ' (long)' : ''}${e.suggestion ? `, suggested ${SUGGESTION[e.suggestion] ?? e.suggestion}` : ''}${e.feeling ? `, felt ${e.feeling}` : ''}`
    case 'set': {
      const r = e.record
      const rest = r.restEnd === null ? '' : `, rest ${Math.round((r.restEnd - r.setEnd) / 1000)} s`
      return `Set ${r.n}, ${GOAL[r.goal] ?? r.goal}${rest}${e.demo ? ' (demo heart rate)' : ''}`
    }
  }
}

function fileDate(): string {
  const d = new Date(now())
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Shared with Settings so both pages export the same file.
export function exportCsv(events: LogEvent[]): void {
  const url = URL.createObjectURL(new Blob([toCsv(events)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `downshift-log-${fileDate()}.csv`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Wipes the log and every setting except the theme.
export async function deleteAllData(): Promise<void> {
  // End live sessions first, without logging, or they would write into the log we are about to clear.
  // A breathe session only runs while its page is shown, so none can be live here.
  discardFocus()
  discardWorkout()
  await disconnect()
  rememberDevice(null)
  await clear()
  updateSettings((s) => ({ ...defaultSettings(), theme: s.theme }))
}

export function HistoryPage() {
  const [events, setEvents] = useState<LogEvent[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    let live = true
    const load = () => void all().then((xs) => live && setEvents(xs))
    load()
    const off = subscribe(load)
    return () => {
      live = false
      off()
    }
  }, [])

  const shown = (events ?? []).filter((e) => filter === 'all' || e.type === filter).reverse()

  return (
    <div className="page">
      <header className="page-head">
        <h1>History</h1>
        <p>Your sessions, kept on this device.</p>
      </header>
      {events && <SharpestHours events={events} />}
      <Card>
        <div className="history-bar">
          <Segmented<Filter>
            label="Filter by type"
            value={filter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'focus', label: 'Focus' },
              { value: 'set', label: 'Workout' },
              { value: 'breathe', label: 'Breathe' },
              { value: 'break', label: 'Breaks' },
              { value: 'nudge', label: 'Nudges' },
            ]}
            onChange={setFilter}
          />
          <Button variant="secondary" disabled={!events?.length} onClick={() => events && exportCsv(events)}>
            Export CSV
          </Button>
        </div>
        {events === null ? (
          <p className="muted">Loading</p>
        ) : shown.length === 0 ? (
          <p className="muted">
            {events.length
              ? 'Nothing of this type yet.'
              : 'Nothing logged yet. Sessions you finish will show up here.'}
          </p>
        ) : (
          <ul className="history-list">
            {shown.map((e, i) => (
              <li key={`${e.t}-${e.type}-${i}`} className="history-item">
                <span className="history-when num">
                  {new Date(e.t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span className="history-type">{LABEL[e.type]}</span>
                <span className="history-detail">{detail(e)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Your data">
        <p className="muted">
          Everything lives on this device. Exporting gives you a CSV; deleting removes the log and resets
          settings (your theme stays).
        </p>
        <div>
          <Button className="btn-danger" onClick={() => setConfirm(true)}>
            Delete all data
          </Button>
        </div>
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Delete all data?"
        confirmLabel="Delete everything"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteAllData()
          setEvents([])
          setConfirm(false)
        }}
      >
        <p>
          This permanently deletes your history, resets all settings, forgets your paired device and clears
          today's tally. It cannot be undone. Your theme is kept.
        </p>
      </ConfirmDialog>
    </div>
  )
}
