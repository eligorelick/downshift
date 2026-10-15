import { PATTERNS, type Settings as SettingsData, resetPreferences } from '@downshift/core'
import { type ReactNode, useId, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Segmented } from '../components/Segmented'
import { VoiceSettings } from '../components/VoiceSettings'
import { all } from '../state/logStore'
import { updateSettings, useSettings } from '../state/settingsStore'
import '../styles/settings.css'
import { deleteAllData, exportCsv } from './HistoryPage'

type BasisKind = 'starting point' | 'tested' | 'convention'

// `text` replaces the tag wording when one value is tested and the rest of the range is not.
function Basis({ basis, text }: { basis: BasisKind; text?: string }) {
  return (
    <span className="basis" data-basis={basis === 'starting point' ? 'start' : basis}>
      {text ?? basis}{' '}
      <a className="tap-link" href="#evidence" aria-label={`why? ${text ?? basis}: see the evidence`}>
        why?
      </a>
    </span>
  )
}

// Range limits mirror the clamps in core normalize(), so the slider can never offer a value that is pulled back.
function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  basis?: BasisKind
  basisText?: string
  onChange: (v: number) => void
}) {
  const id = useId()
  const { label, value, min, max, unit, basis, basisText, onChange } = props
  return (
    <div className="field">
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="num field-val">
          {value} {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        aria-valuetext={`${value} ${unit}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="field-note">
        <span className="muted num">
          Range {min} to {max} {unit}
        </span>
        {basis && <Basis basis={basis} text={basisText} />}
      </div>
    </div>
  )
}

function Toggle(props: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="field toggle">
      <input
        id={id}
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <label htmlFor={id}>
        {props.label}
        {props.hint && <span className="muted"> {props.hint}</span>}
      </label>
    </div>
  )
}

function Choice(props: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{props.label}</span>
      {props.children}
    </div>
  )
}

export function Settings() {
  const s = useSettings()
  const [resetOpen, setResetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const set = (patch: Partial<SettingsData>) => updateSettings(patch)
  const rest = (k: keyof SettingsData['restFloorSec'], v: number) =>
    updateSettings((x) => ({ ...x, restFloorSec: { ...x.restFloorSec, [k]: v } }))
  const block = (k: keyof SettingsData['blockMin'], v: number) =>
    updateSettings((x) => ({ ...x, blockMin: { ...x.blockMin, [k]: v } }))

  return (
    <div className="page settings">
      <header className="page-head">
        <h1>Settings</h1>
        <p>Make Downshift fit how you work. Changes save as you go.</p>
      </header>

      <Card title="General">
        <Choice label="Theme">
          <Segmented
            label="Theme"
            value={s.theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(theme) => set({ theme })}
          />
        </Choice>
        <Toggle label="Mute all sound" checked={s.mute} onChange={(mute) => set({ mute })} />
        <Slider
          label="Volume"
          value={s.volume}
          min={0}
          max={100}
          unit="%"
          onChange={(volume) => set({ volume })}
        />
        <VoiceSettings />
        <Toggle
          label="Tones"
          hint="Soft tones that mark each breath, and the chimes in Workout."
          checked={s.tones}
          onChange={(tones) => set({ tones })}
        />
        <Toggle
          label="Vibrate"
          hint="Buzz the phone for cues, where supported."
          checked={s.vibrate}
          onChange={(vibrate) => set({ vibrate })}
        />
      </Card>

      <Card title="Focus">
        <Choice label="Preset">
          <Segmented
            label="Preset"
            value={s.preset}
            options={[
              { value: 'school', label: 'School' },
              { value: 'work', label: 'Work' },
            ]}
            onChange={(preset) => set({ preset })}
          />
        </Choice>
        <Slider
          label="School block length"
          value={s.blockMin.school}
          min={20}
          max={50}
          unit="min"
          basis="starting point"
          basisText="25 min was tested in student trials, with mixed results; other lengths are starting points"
          onChange={(v) => block('school', v)}
        />
        <Slider
          label="Work block length"
          value={s.blockMin.work}
          min={25}
          max={60}
          unit="min"
          basis="starting point"
          onChange={(v) => block('work', v)}
        />
        <Choice label="Heart rate nudge">
          <Segmented
            label="Heart rate nudge"
            value={s.nudgeMode}
            options={[
              { value: 'focus', label: 'In focus' },
              { value: 'always', label: 'Always' },
              { value: 'off', label: 'Off' },
            ]}
            onChange={(nudgeMode) => set({ nudgeMode })}
          />
        </Choice>
        {s.nudgeMode === 'always' && (
          <p className="muted small">
            The Home companion is on. Use its Start, Snooze and Stop controls while working or studying.
            Movement can raise heart rate too; your response decides what to do.
          </p>
        )}
        <p className="muted small">
          The nudge only asks if you feel tense. Heart rate alone hasn't been shown to detect stress.
        </p>
        <Slider
          label="Rise above baseline"
          value={s.nudgeDelta}
          min={10}
          max={30}
          unit="bpm"
          basis="starting point"
          onChange={(nudgeDelta) => set({ nudgeDelta })}
        />
        <Slider
          label="Held for"
          value={s.nudgeMinutes}
          min={3}
          max={10}
          unit="min"
          basis="starting point"
          onChange={(nudgeMinutes) => set({ nudgeMinutes })}
        />
        <Slider
          label="Wait between nudges"
          value={s.waitMin}
          min={30}
          max={240}
          unit="min"
          basis="starting point"
          onChange={(waitMin) => set({ waitMin })}
        />
        <Slider
          label="Daily cap"
          value={s.dailyCap}
          min={1}
          max={6}
          unit="per day"
          basis="starting point"
          onChange={(dailyCap) => set({ dailyCap })}
        />
        <Slider
          label="High heart rate check-in"
          value={s.highLimit}
          min={110}
          max={170}
          unit="bpm"
          basis="starting point"
          onChange={(highLimit) => set({ highLimit })}
        />
        <Toggle
          label="Sound with heart rate prompts"
          hint="Prompts are silent by default so they don't interrupt."
          checked={s.promptSound}
          onChange={(promptSound) => set({ promptSound })}
        />
        <Toggle
          label="Ask how I feel at breaks"
          checked={s.askFeeling}
          onChange={(askFeeling) => set({ askFeeling })}
        />
        <Toggle
          label="Ask how sharp I felt after each session"
          hint="Shows your own ratings by time of day in History."
          checked={s.askSharpness}
          onChange={(askSharpness) => set({ askSharpness })}
        />
        <Toggle label="Break sound" checked={s.breakSound} onChange={(breakSound) => set({ breakSound })} />
      </Card>

      <Card title="Workout">
        <Choice label="Goal">
          <Segmented
            label="Goal"
            value={s.goal}
            options={[
              { value: 'strength', label: 'Strength' },
              { value: 'hypertrophy', label: 'Muscle size' },
              { value: 'endurance', label: 'Endurance' },
            ]}
            onChange={(goal) => set({ goal })}
          />
        </Choice>
        <p className="muted small">
          Rest floors are minimums from group averages. The timer never says stop.
        </p>
        <Slider
          label="Strength rest"
          value={s.restFloorSec.strength}
          min={60}
          max={300}
          unit="s"
          basis="tested"
          basisText="rests over about 2 min tested for trained lifters"
          onChange={(v) => rest('strength', v)}
        />
        <Slider
          label="Muscle size rest, big lifts"
          value={s.restFloorSec.hypertrophy}
          min={30}
          max={180}
          unit="s"
          basis="starting point"
          onChange={(v) => rest('hypertrophy', v)}
        />
        <Slider
          label="Muscle size rest, isolation"
          value={s.restFloorSec.hypertrophyIsolation}
          min={30}
          max={180}
          unit="s"
          basis="starting point"
          basisText="rests over 60 s tested, with little gain past about 90 s; the exact value is a starting point"
          onChange={(v) => rest('hypertrophyIsolation', v)}
        />
        <Slider
          label="Endurance rest"
          value={s.restFloorSec.endurance}
          min={15}
          max={120}
          unit="s"
          basis="convention"
          onChange={(v) => rest('endurance', v)}
        />
        <Toggle
          label="Heart rate cues"
          hint="Advisory only: heart rate has settled, or take more time."
          checked={s.restHrCues}
          onChange={(restHrCues) => set({ restHrCues })}
        />
        <Toggle
          label="Suggest when a set has ended"
          hint="A starting point; tapping is the main way."
          checked={s.setEndSuggest}
          onChange={(setEndSuggest) => set({ setEndSuggest })}
        />
        <Toggle
          label="Breathing between sets"
          hint="No performance claim."
          checked={s.breathingBetweenSets}
          onChange={(breathingBetweenSets) => set({ breathingBetweenSets })}
        />
      </Card>

      <Card title="Breathing">
        <Choice label="Pattern">
          <Segmented
            label="Pattern"
            value={s.pattern}
            options={PATTERNS.map((p) => ({
              value: p.key,
              label:
                { slow46: '4 in, 6 out', slow55: '5 in, 5 out', sigh: 'Sighing', box: 'Box' }[p.key] ?? p.key,
            }))}
            onChange={(pattern) => set({ pattern })}
          />
        </Choice>
        <Choice label="Session length">
          <Segmented
            label="Session length"
            value={String(s.breathMinutes) as '2' | '5'}
            options={[
              { value: '2', label: '2 min' },
              { value: '5', label: '5 min' },
            ]}
            onChange={(v) => set({ breathMinutes: v === '2' ? 2 : 5 })}
          />
        </Choice>
        <p className="muted small">
          Sessions shorter than five minutes were linked to programs that didn't work; five minutes or more
          showed no such link (an association, not a tested dose). 2 minutes rests on small pilots.
        </p>
      </Card>

      <Card title="Data">
        <p className="muted">Everything stays on this device.</p>
        <div className="row">
          <Button variant="secondary" onClick={async () => exportCsv(await all())}>
            Export CSV
          </Button>
          <Button className="btn-danger" onClick={() => setDeleteOpen(true)}>
            Delete all data
          </Button>
        </div>
        <hr />
        <p className="muted">
          Reset preferences puts every setting above back to its default. Your paired device, history and
          today's counts stay.
        </p>
        <div>
          <Button variant="secondary" onClick={() => setResetOpen(true)}>
            Reset preferences
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        title="Reset preferences?"
        confirmLabel="Reset"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          updateSettings((x) => resetPreferences(x))
          setResetOpen(false)
        }}
      >
        <p>
          All settings go back to their defaults. Your paired device, history and today's counts are kept.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete all data?"
        confirmLabel="Delete everything"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await deleteAllData()
          setDeleteOpen(false)
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
