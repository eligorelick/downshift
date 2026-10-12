import type { ConnectionState } from '@downshift/ble'
import { useHeartRate, useLiveBpm } from '../state/hrStore'
import { useRoute } from '../state/route'

type Dot = 'live' | 'idle' | 'working' | 'lost' | 'problem'

const LABEL: Record<ConnectionState, { dot: Dot; text: string }> = {
  connected: { dot: 'live', text: 'Connected' },
  disconnected: { dot: 'idle', text: 'No device' },
  requesting: { dot: 'working', text: 'Choosing' },
  connecting: { dot: 'working', text: 'Connecting' },
  reconnecting: { dot: 'lost', text: 'Reconnecting' },
  unsupported: { dot: 'problem', text: 'Unsupported' },
  error: { dot: 'problem', text: 'Problem' },
}

export function HrBadge() {
  const hr = useHeartRate()
  const route = useRoute()
  const { dot, text: stateText } = LABEL[hr.state]
  // Demo data must not pass for a real device anywhere it is shown.
  const text = hr.state === 'connected' && hr.kind === 'simulated' ? 'Demo' : stateText
  const showBpm = useLiveBpm() !== null
  return (
    <a
      className="hr-badge"
      href="#device"
      aria-label={
        showBpm
          ? `${hr.kind === 'simulated' ? 'Demo · ' : ''}${hr.bpm} bpm, heart rate ${text.toLowerCase()}`
          : `Heart rate: ${text}`
      }
      aria-current={route.page === 'device' ? 'page' : undefined}
    >
      <span className="hr-dot" data-s={dot} aria-hidden="true" />
      {showBpm ? (
        <span aria-hidden="true">
          {hr.kind === 'simulated' && <span className="hr-demo">Demo · </span>}
          <span className="hr-bpm num">{hr.bpm}</span> <span className="hr-unit">bpm</span>
        </span>
      ) : (
        <span className="hr-label" aria-hidden="true">
          {text}
        </span>
      )}
    </a>
  )
}
