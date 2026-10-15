import type { DeviceRef } from '@downshift/core'
import type { Clock, ConnectionState, HeartRateReading, HeartRateSource } from './types'

export type Scenario = 'resting' | 'stress-rise'

export interface SimulatedOptions extends Clock {
  scenario: Scenario
  intervalMs?: number
  seed?: number
  // Simulated seconds per real second.
  speed?: number
}

const SIM_DEVICE: DeviceRef = { id: 'simulated', name: 'Simulated device' }

// Deterministic noise in [-1, 1] for a whole simulated second, so a reading depends only on time.
function noise(seed: number, second: number): number {
  let x = (Math.imul(second | 0, 0x9e3779b1) ^ Math.imul(seed | 0, 0x85ebca6b)) >>> 0
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0
  x = (x ^ (x >>> 15)) >>> 0
  return (x / 0xffffffff) * 2 - 1
}

function resting(s: number): number {
  return 68 + 2 * Math.sin((2 * Math.PI * s) / 60)
}

function bpmAt(scenario: Scenario, s: number): number {
  switch (scenario) {
    case 'resting':
      return resting(s)
    case 'stress-rise':
      // Quiet for 20 minutes, then a minute-long climb. The nudge detector has a baseline only after about 15
      // minutes (a 5-minute settle, 5 baseline minutes, and the newest 5 held out), so 20 leaves a margin and
      // the rise is not learned as baseline.
      return resting(s) + 18 * Math.min(1, Math.max(0, (s - 1200) / 60))
  }
}

export class SimulatedSource implements HeartRateSource {
  readonly kind = 'simulated' as const
  state: ConnectionState = 'disconnected'
  device: DeviceRef | null = null

  private readonly scenario: Scenario
  private readonly intervalMs: number
  private readonly seed: number
  private readonly speed: number
  private readonly now: () => number
  private readonly setIv: (fn: () => void, ms: number) => unknown
  private readonly clearIv: (h: unknown) => void
  private start: number
  private timer: unknown = null
  private readingSubs = new Set<(r: HeartRateReading) => void>()
  private stateSubs = new Set<(s: ConnectionState, detail?: string) => void>()

  constructor(opts: SimulatedOptions) {
    this.scenario = opts.scenario
    this.intervalMs = opts.intervalMs ?? 1000
    this.seed = opts.seed ?? 1
    this.speed = opts.speed ?? 1
    this.now = opts.now ?? (() => Date.now())
    this.setIv = opts.setInterval ?? ((fn, ms) => setInterval(fn, ms))
    this.clearIv = opts.clearInterval ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>))
    this.start = this.now()
  }

  async connect(): Promise<void> {
    this.setState('connecting')
    this.start = this.now()
    if (this.timer !== null) this.clearIv(this.timer)
    this.device = SIM_DEVICE
    this.timer = this.setIv(() => this.step(this.now()), this.intervalMs)
    this.setState('connected')
  }

  async disconnect(): Promise<void> {
    if (this.timer !== null) this.clearIv(this.timer)
    this.timer = null
    this.device = null
    this.setState('disconnected')
  }

  // Emits the reading for time t (ms). Public so tests and the app can fill a jump in time.
  step(t: number): void {
    const s = (Math.max(0, t - this.start) / 1000) * this.speed
    const bpm = Math.round(bpmAt(this.scenario, s) + noise(this.seed, Math.floor(s)))
    const r: HeartRateReading = { t, bpm, contact: true }
    for (const cb of [...this.readingSubs]) {
      try {
        cb(r)
      } catch {
        // One bad listener must not stop the others.
      }
    }
  }

  onReading(cb: (r: HeartRateReading) => void): () => void {
    this.readingSubs.add(cb)
    return () => this.readingSubs.delete(cb)
  }

  onState(cb: (s: ConnectionState, detail?: string) => void): () => void {
    this.stateSubs.add(cb)
    return () => this.stateSubs.delete(cb)
  }

  private setState(s: ConnectionState): void {
    if (this.state === s) return
    this.state = s
    for (const cb of [...this.stateSubs]) {
      try {
        cb(s)
      } catch {
        // One bad listener must not stop the others.
      }
    }
  }
}
