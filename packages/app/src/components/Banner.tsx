import { useEffect, useRef, useState } from 'react'
import { type AlertEvent, onAlert } from '../platform/alerts'
import { dismissStorageNotice, useStorageNotice } from '../state/settingsStore'
import { Button } from './Button'
import { refocusSoon } from './useStageFocus'

const SHOW_MS = 9000

// One live region for every in-app notice, so screen readers announce alerts without moving focus.
export function Banner() {
  const [items, setItems] = useState<AlertEvent[]>([])
  const storageNotice = useStorageNotice()
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    const off = onAlert((e) => {
      setItems((xs) => [...xs, e])
      pending.add(setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== e.id)), SHOW_MS))
    })
    return () => {
      off()
      for (const t of pending) clearTimeout(t)
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
