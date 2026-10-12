import type { DeviceRef } from '@downshift/core'

export interface HeartRateReading {
  t: number
  bpm: number
  contact?: boolean
  rrMs?: number[]
}

export type ConnectionState =
  | 'disconnected'
  | 'requesting'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'unsupported'
  | 'error'

export interface HeartRateSource {
  readonly kind: 'web-bluetooth' | 'simulated'
  readonly state: ConnectionState
  readonly device: DeviceRef | null
  connect(opts?: { remembered?: DeviceRef | null }): Promise<void>
  disconnect(): Promise<void>
  onReading(cb: (r: HeartRateReading) => void): () => void
  onState(cb: (s: ConnectionState, detail?: string) => void): () => void
}

// Time and timers are injectable so tests (and e2e) can drive them deterministically.
export interface Clock {
  now?: () => number
  setTimeout?: (fn: () => void, ms: number) => unknown
  clearTimeout?: (handle: unknown) => void
  setInterval?: (fn: () => void, ms: number) => unknown
  clearInterval?: (handle: unknown) => void
}
