import { type ReactNode, useEffect, useRef } from 'react'
import type { PageKey } from '../state/route'
import { Banner } from './Banner'
import { HrBadge } from './HrBadge'
import { Icon, type IconName } from './Icon'

export const NAV: ReadonlyArray<{ page: PageKey; label: string; icon: IconName }> = [
  { page: 'home', label: 'Home', icon: 'home' },
  { page: 'focus', label: 'Focus', icon: 'focus' },
  { page: 'breathe', label: 'Breathe', icon: 'breathe' },
  { page: 'history', label: 'History', icon: 'history' },
  { page: 'device', label: 'Device', icon: 'device' },
  { page: 'evidence', label: 'Evidence', icon: 'evidence' },
  { page: 'settings', label: 'Settings', icon: 'settings' },
]

// Phones keep the four daily tools in the tab bar; Device is behind the heart-rate badge.
const TABS = NAV.filter((n) => ['home', 'focus', 'breathe', 'history'].includes(n.page))
const TOP = NAV.filter((n) => n.page === 'evidence' || n.page === 'settings')

function NavLink(props: { page: PageKey; label: string; icon: IconName; current: boolean }) {
  return (
    <a className="nav-link" href={`#${props.page}`} aria-current={props.current ? 'page' : undefined}>
      <Icon name={props.icon} />
      <span>{props.label}</span>
    </a>
  )
}

// `page` comes from App, so the layout and the new page update in the same render and the focus effect
// below sees the new page's heading, not the old one.
export function Layout({ page, children }: { page: PageKey; children: ReactNode }) {
  const main = useRef<HTMLElement>(null)
  const first = useRef(true)

  // Hash navigation does not move focus, so send it to the new page heading for screen readers.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on route change only
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo(0, 0)
    // Focus mid-session has no h1, so fall back to its stage element or first heading.
    const target =
      main.current?.querySelector<HTMLElement>('h1') ??
      main.current?.querySelector<HTMLElement>('[data-stage-focus]') ??
      main.current?.querySelector<HTMLElement>('h2')
    if (target) {
      if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) target.tabIndex = -1
      target.focus({ preventScroll: true })
    }
  }, [page])

  return (
    <div className="shell">
      <button type="button" className="skip-link" onClick={() => main.current?.focus()}>
        Skip to content
      </button>
      <Banner />

      <aside className="sidebar">
        <a className="brand" href="#home">
          <img src="./icon.svg" alt="" />
          Downshift
        </a>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.page} {...n} current={n.page === page} />
          ))}
        </nav>
        <div className="sidebar-foot">
          <HrBadge />
        </div>
      </aside>

      <header className="topbar">
        <a className="brand" href="#home">
          <img src="./icon.svg" alt="" />
          <span className="brand-name">Downshift</span>
        </a>
        <HrBadge />
        {TOP.map((n) => (
          <a
            key={n.page}
            className="icon-link"
            href={`#${n.page}`}
            aria-label={n.label}
            aria-current={n.page === page ? 'page' : undefined}
          >
            <Icon name={n.icon} />
          </a>
        ))}
      </header>

      <main id="main" ref={main} className="main" data-page={page} tabIndex={-1}>
        {children}
      </main>

      <nav className="tabbar" aria-label="Tabs">
        {TABS.map((n) => (
          <NavLink key={n.page} {...n} current={n.page === page} />
        ))}
      </nav>
    </div>
  )
}
