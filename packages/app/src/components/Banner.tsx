import { useEffect, useRef, useState } from 'react'
import { type AlertEvent, onAlert, onClearAlerts } from '../platform/alerts'
import { dismissStorageNotice, useStorageNotice } from '../state/settingsStore'
import { Button } from './Button'
import { refocusSoon } from './useStageFocus'

const SHOW_MS = 9000

// One live region for every in-app notice, so screen readers announce alerts without moving focus.
export function Banner() {
  const [items, setItems] = useState<AlertEvent[]>([])
  const storageNotice = useStorageNotice()
  const timers = useRef(new Map<number, { timer: ReturnType<typeof setTimeout>; scope?: string }>())

  useEffect(() => {
    const pending = timers.current
    const off = onAlert((e) => {
      setItems((xs) => [...xs, e])
      const timer = setTimeout(() => {
        pending.delete(e.id)
        setItems((xs) => xs.filter((x) => x.id !== e.id))
      }, SHOW_MS)
      pending.set(e.id, { timer, scope: e.scope })
    })
    const offClear = onClearAlerts((scope) => {
      setItems((xs) => (scope === undefined ? [] : xs.filter((x) => x.scope !== scope)))
      for (const [id, entry] of pending) {
        if (scope !== undefined && entry.scope !== scope) continue
        clearTimeout(entry.timer)
        pending.delete(id)
      }
    })
    return () => {
      off()
      offClear()
      for (const entry of pending.values()) clearTimeout(entry.timer)
      pending.clear()
    }
  }, [])

  return (
    // biome-ignore lint/a11y/useSemanticElements: a live-region container that also holds buttons, not an <output>
    <div className="banner-region" role="status" aria-live="polite">
      {storageNotice && (
        <div className="banner" data-kind="warn">
          <div className="banner-text">
            <strong>Settings not saved</strong>
            <span>{storageNotice}</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              dismissStorageNotice()
              refocusSoon()
            }}
          >
            Dismiss
          </Button>
        </div>
      )}
      {items.map((e) => (
        <div className="banner" key={e.id}>
          <div className="banner-text">
            <strong>{e.title}</strong>
            {e.body && <span>{e.body}</span>}
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setItems((xs) => xs.filter((x) => x.id !== e.id))
              const entry = timers.current.get(e.id)
              if (entry) clearTimeout(entry.timer)
              timers.current.delete(e.id)
              refocusSoon()
            }}
          >
            Dismiss
          </Button>
        </div>
      ))}
    </div>
  )
}
