import { useState, useSyncExternalStore } from 'react'
import { btLog } from '../state/hrStore'
import { Button } from './Button'

let cached = btLog.text()
let cachedLast = btLog.entries.at(-1)

// The snapshot must be the same string until the log changes. The line count stops moving once the log is
// full (it keeps the last 500 lines), so compare the newest line instead.
function snapshot(): string {
  const last = btLog.entries.at(-1)
  if (last !== cachedLast) {
    cachedLast = last
    cached = btLog.text()
  }
  return cached
}

export function BtLogView() {
  const text = useSyncExternalStore((cb) => btLog.subscribe(cb), snapshot)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
    setTimeout(() => setCopied(null), 2500)
  }

  return (
    <div className="btlog">
      <textarea
        className="btlog-text"
        readOnly
        rows={8}
        aria-label="Bluetooth log"
        placeholder="Nothing yet. Connect a device and the steps appear here."
        value={text}
      />
      <div className="row">
        <Button variant="secondary" onClick={() => void copy()} disabled={!text}>
          Copy log
        </Button>
        <span className="muted" aria-live="polite">
          {copied === 'ok' && 'Copied'}
          {copied === 'fail' && "Couldn't copy. Select the text and copy it by hand."}
        </span>
      </div>
    </div>
  )
}
