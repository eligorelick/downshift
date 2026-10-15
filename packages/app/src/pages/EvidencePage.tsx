import { Fragment, type ReactNode, useEffect } from 'react'
import { Card } from '../components/Card'
import {
  COGNITION_SOURCES,
  EVIDENCE_INTRO,
  EVIDENCE_SECTIONS,
  type EvidenceTable,
  WORK_STUDY_SOURCES,
  toneOf,
} from '../content/evidence'
import '../styles/evidence.css'

const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g

// Turns "[label](url)" into a link that opens in a new tab.
function rich(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    out.push(
      <a key={at} href={m[2]} target="_blank" rel="noopener noreferrer">
        {m[1]}
      </a>,
    )
    last = at + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function Tag({ status }: { status: string }) {
  return (
    <span className="ev-tag" data-tone={toneOf(status)}>
      {status}
    </span>
  )
}

function Table({ t }: { t: EvidenceTable }) {
  return (
    <div className="ev-table">
      {t.caption && <h3>{t.caption}</h3>}
      <ul className="ev-rows">
        {t.rows.map((row) => {
          const status = t.statusAll ?? (t.statusCol === undefined ? null : row[t.statusCol])
          const cols = row.map((cell, i) => ({ cell, i })).filter(({ i }) => i > 0 && i !== t.statusCol)
          return (
            <li key={row[0]} className="ev-row">
              <div className="ev-row-head">
                <strong>{row[0]}</strong>
                {status && <Tag status={status} />}
              </div>
              {cols.map(({ cell, i }) => (
                <p key={t.columns[i]}>
                  {t.columns.length > 3 && <span className="ev-col">{t.columns[i]}: </span>}
                  {rich(cell)}
                </p>
              ))}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="ev-bullets">
      {items.map((b) => (
        <li key={b}>{rich(b)}</li>
      ))}
    </ul>
  )
}

export function EvidencePage() {
  // Opened at a section ("#evidence-breathing", e.g. a contents link in a new tab): go to it.
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id.startsWith('evidence-')) document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [])
  return (
    <div className="page evidence">
      <header className="page-head">
        <h1>Evidence</h1>
        <p>{EVIDENCE_INTRO}</p>
      </header>
      <ul className="ev-legend" aria-label="Tag meanings">
        <li>
          <span className="ev-tag" data-tone="tested">
            Tested
          </span>{' '}
          used in controlled studies
        </li>
        <li>
          <span className="ev-tag" data-tone="partial">
            Partly tested
          </span>{' '}
          small, pilot or indirect evidence
        </li>
        <li>
          <span className="ev-tag" data-tone="start">
            Starting point
          </span>{' '}
          reasoned, not tested in this form
        </li>
      </ul>
      <nav className="ev-toc" aria-label="Sections">
        {EVIDENCE_SECTIONS.map((s) => (
          <a key={s.id} href={`#evidence-${s.id}`} onClick={(e) => jump(e, s.id)}>
            {s.title}
          </a>
        ))}
      </nav>
      {EVIDENCE_SECTIONS.map((s) => (
        <section key={s.id} id={`evidence-${s.id}`} className="card ev-section" tabIndex={-1}>
          <h2>{s.title}</h2>
          {s.lead && <p className="ev-lead">{s.lead}</p>}
          {s.bullets && <Bullets items={s.bullets} />}
          {s.tables?.map((t) => (
            <Table key={t.caption ?? t.columns.join()} t={t} />
          ))}
          {s.subsections?.map((sub) => (
            <Fragment key={sub.title}>
              {sub.title && <h3 className="ev-sub">{sub.title}</h3>}
              {sub.bullets && <Bullets items={sub.bullets} />}
              {sub.tables?.map((t) => (
                <Table key={t.caption ?? t.columns.join()} t={t} />
              ))}
            </Fragment>
          ))}
        </section>
      ))}
      <Card title="Sources for work, study and breathing">
        <ol className="ev-sources">
          {WORK_STUDY_SOURCES.map((src) => (
            <li key={src}>{rich(src)}</li>
          ))}
        </ol>
      </Card>
      <Card title="Sources for Heart rate and thinking">
        <p className="ev-sources-note">Abstract only unless stated.</p>
        <ol className="ev-sources">
          {COGNITION_SOURCES.map((src) => (
            <li key={src}>{rich(src)}</li>
          ))}
        </ol>
      </Card>
    </div>
  )
}

// A plain hash link would add a history entry and jump without the smooth scroll, so scroll here instead.
function jump(e: React.MouseEvent, id: string): void {
  // Ctrl/Cmd/Shift-click opens the section in a new tab or window, as the browser would.
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  const section = document.getElementById(`evidence-${id}`)
  section?.scrollIntoView({
    // An explicit 'smooth' overrides the reduced-motion CSS rule, so check the setting here too.
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })
  // Keyboard and screen reader users carry on from the section, not from the contents list.
  section?.focus({ preventScroll: true })
}
