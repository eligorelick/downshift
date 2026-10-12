import { type DeviceRef, matches, parseHrPacket } from '@downshift/core'
import type { BtLog } from './btLog'
import type { Clock, ConnectionState, HeartRateReading, HeartRateSource } from './types'

// Seconds to wait before each reconnect attempt; short at first in case the drop was brief.
const RETRY_DELAYS_S = [1, 2, 5, 10, 30, 30, 30, 30, 30, 30]
// 25-240 bpm: anything outside this range is a sensor glitch, not a heart.
const MIN_BPM = 25
// How the log names a device: its name in quotes, or "an unnamed device" without quotes.
const deviceLabel = (name: string | undefined): string => (name ? `"${name}"` : 'an unnamed device')
const MAX_BPM = 240

const LOST_MESSAGE = 'Lost the device. Choose it again on the Device page.'

type Stage = 'choose' | 'connect'

function describeError(e: unknown, stage: Stage): string {
  const name = e instanceof DOMException ? e.name : ''
  switch (name) {
    case 'SecurityError':
      return 'The browser blocked Bluetooth here. Allow Bluetooth for this site in the browser settings.'
    case 'NetworkError':
      return "Couldn't connect to the device. Keep it close, make sure it is switched on, and disconnect it from other apps."
    case 'NotSupportedError':
      return "This browser or device can't do Bluetooth heart rate. See the Device page for what works."
    case 'NotFoundError':
      return stage === 'connect'
        ? "The device doesn't offer heart rate. On WHOOP, users report turning on HR Broadcast in the WHOOP app's Device settings (not confirmed by WHOOP)."
        : 'Bluetooth is off or this device has no Bluetooth adapter.'
    default:
      return `Bluetooth failed${e instanceof Error && e.message ? `: ${e.message}` : '.'}`
  }
}

export class WebBluetoothSource implements HeartRateSource {
  readonly kind = 'web-bluetooth' as const
  state: ConnectionState = 'disconnected'
  device: DeviceRef | null = null

  private readonly now: () => number
  private readonly setT: (fn: () => void, ms: number) => unknown
  private readonly clearT: (h: unknown) => void
  private btDevice: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private timer: unknown = null
  // Bumped on every connect/disconnect so stale async work knows it was superseded.
  private generation = 0
  private userDisconnected = false
  private retrying = false
  private droppedCount = 0
  private readingSubs = new Set<(r: HeartRateReading) => void>()
  private stateSubs = new Set<(s: ConnectionState, detail?: string) => void>()

  constructor(
    private bt: Bluetooth,
    private log: BtLog,
    clock: Clock = {},
  ) {
    this.now = clock.now ?? (() => Date.now())
    this.setT = clock.setTimeout ?? ((fn, ms) => setTimeout(fn, ms))
    this.clearT = clock.clearTimeout ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  }

  async connect(opts: { remembered?: DeviceRef | null } = {}): Promise<void> {
    if (this.btDevice) this.teardown()
    const gen = ++this.generation
    this.userDisconnected = false
    this.droppedCount = 0
    this.setState('requesting')

    let dev: BluetoothDevice | null = null
    try {
      const found = await this.findRemembered(opts.remembered ?? null)
      // Disconnect (or a newer connect) while the remembered device was being looked up: log nothing and do
      // not open the chooser.
      if (gen !== this.generation) return
      if (found.note) this.log.add(found.note)
      dev = found.dev
      if (!dev) {
        this.log.add('Asking the browser to choose a heart rate device.')
        dev = await this.bt.requestDevice({
          // Some devices may not list heart_rate in their advertisement (suspected for WHOOP, unverified), so a
          // service filter alone could hide them. Match by name too (WHOOP, Charge, Pixel Watch) and list the
          // services in optionalServices so the page may still read them after connecting.
          filters: [
            { services: ['heart_rate'] },
            { namePrefix: 'WHOOP' },
            { namePrefix: 'Charge' },
            { namePrefix: 'Pixel Watch' },
          ],
          optionalServices: ['heart_rate', 'battery_service'],
        })
      }
    } catch (e) {
      if (gen !== this.generation) return
      if (e instanceof DOMException && e.name === 'NotFoundError' && /cancel/i.test(e.message)) {
        this.log.add('No device was chosen.')
        this.setState('disconnected')
        return
      }
      const msg = describeError(e, 'choose')
      this.log.add(`Could not choose a device: ${msg}`)
      this.setState('error', msg)
      return
    }
    if (gen !== this.generation) return

    this.btDevice = dev
    this.device = { id: dev.id, name: dev.name ?? '' }
    dev.addEventListener('gattserverdisconnected', this.onDropped)
    this.setState('connecting')
    this.log.add(`Connecting to ${deviceLabel(this.device.name)}.`)
    try {
      if (!(await this.openGatt(dev, gen))) return
    } catch (e) {
      if (gen !== this.generation) return
      this.teardown()
      const msg = describeError(e, 'connect')
      this.log.add(`Connect failed: ${msg}`)
      this.setState('error', msg)
      return
    }
    if (gen !== this.generation) return
    this.log.add('Connected. Waiting for heart rate.')
    this.setState('connected')
  }

  async disconnect(): Promise<void> {
    this.userDisconnected = true
    this.teardown()
    this.log.add('Disconnected.')
    this.setState('disconnected')
  }

  // Stops everything for the current device, including a connection still being made.
  private teardown(): void {
    this.generation++
    this.retrying = false
    if (this.timer !== null) this.clearT(this.timer)
    this.timer = null
    this.detach()
    const dev = this.btDevice
    this.btDevice = null
    this.device = null
    if (!dev) return
    dev.removeEventListener('gattserverdisconnected', this.onDropped)
    dev.gatt?.disconnect()
  }
  onReading(cb: (r: HeartRateReading) => void): () => void {
    this.readingSubs.add(cb)
    return () => this.readingSubs.delete(cb)
  }

  onState(cb: (s: ConnectionState, detail?: string) => void): () => void {
    this.stateSubs.add(cb)
    return () => this.stateSubs.delete(cb)
  }

  // Returns the log line instead of writing it, so a lookup that has been superseded stays silent.
  private async findRemembered(
    remembered: DeviceRef | null,
  ): Promise<{ dev: BluetoothDevice | null; note: string | null }> {
    if (!remembered || typeof this.bt.getDevices !== 'function') return { dev: null, note: null }
    try {
      const known = await this.bt.getDevices()
      const hit = known.find((d) => matches(remembered, { id: d.id, name: d.name ?? '' }))
      const note = hit
        ? `Found the remembered device${hit.name ? ` "${hit.name}"` : ' (it has no name)'} without asking.`
        : 'The remembered device was not found.'
      return { dev: hit ?? null, note }
    } catch (e) {
      return { dev: null, note: `Could not look up remembered devices: ${describeError(e, 'choose')}` }
    }
  }

  // Returns false (after letting go of the device) if a newer connect/disconnect replaced this attempt.
  private async openGatt(dev: BluetoothDevice, gen: number): Promise<boolean> {
    if (!dev.gatt) throw new DOMException('No GATT server', 'NotSupportedError')
    const stale = (): boolean => {
      if (gen === this.generation) return false
      // A newer connect() on the same device shares this gatt; only let go if nobody owns it now.
      if (this.btDevice !== dev) dev.gatt?.disconnect()
      return true
    }
    const server = await dev.gatt.connect()
    if (stale()) return false
    const service = await server.getPrimaryService('heart_rate')
    if (stale()) return false
    const ch = await service.getCharacteristic('heart_rate_measurement')
    if (stale()) return false
    this.detach()
    ch.addEventListener('characteristicvaluechanged', this.onValue)
    this.characteristic = ch
    await ch.startNotifications()
    return !stale()
  }
  private detach(): void {
    this.characteristic?.removeEventListener('characteristicvaluechanged', this.onValue)
    this.characteristic = null
  }

  private onValue = (ev: Event): void => {
    if (this.userDisconnected) return
    const view = (ev.target as BluetoothRemoteGATTCharacteristic | null)?.value
    if (!view) return
    const p = parseHrPacket(view)
    if (!p) return
    if (p.bpm < MIN_BPM || p.bpm > MAX_BPM) {
      this.droppedCount++
      // Log the first one and then every tenth so a bad device doesn't flood the log.
      if (this.droppedCount === 1 || this.droppedCount % 10 === 0) {
        this.log.add(`Ignored ${this.droppedCount} heart rate value(s) outside ${MIN_BPM}-${MAX_BPM} bpm.`)
      }
      return
    }
    const r: HeartRateReading = {
      t: this.now(),
      bpm: p.bpm,
      contact: p.contact,
      rrMs: p.rrMs.length > 0 ? p.rrMs : undefined,
    }
    for (const cb of [...this.readingSubs]) {
      try {
        cb(r)
      } catch (e) {
        this.log.add(`A heart rate listener failed: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  private onDropped = (): void => {
    // Ignore drops while we are already connecting or retrying; those paths handle their own failures.
    if (this.userDisconnected || this.retrying || this.state === 'connecting' || this.state === 'requesting')
      return
    this.detach()
    this.log.add('The device disconnected. Trying to reconnect.')
    this.retrying = true
    this.setState('reconnecting')
    void this.retry(0, this.generation)
  }

  private retry(attempt: number, gen: number): Promise<void> {
    const delay = RETRY_DELAYS_S[attempt]
    if (delay === undefined) {
      this.retrying = false
      this.teardown()
      this.log.add(LOST_MESSAGE)
      this.setState('error', LOST_MESSAGE)
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.timer = this.setT(async () => {
        this.timer = null
        const dev = this.btDevice
        if (gen !== this.generation || !dev) return resolve()
        try {
          if (!(await this.openGatt(dev, gen))) return resolve()
          this.retrying = false
          this.log.add(`Reconnected after ${attempt + 1} attempt(s).`)
          this.setState('connected')
        } catch (e) {
          if (gen !== this.generation) return resolve()
          this.log.add(`Reconnect attempt ${attempt + 1} failed: ${describeError(e, 'connect')}`)
          await this.retry(attempt + 1, gen)
        }
        resolve()
      }, delay * 1000)
    })
  }

  private setState(s: ConnectionState, detail?: string): void {
    if (this.state === s && detail === undefined) return
    this.state = s
    for (const cb of [...this.stateSubs]) {
      try {
        cb(s, detail)
      } catch (e) {
        this.log.add(`A state listener failed: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }
}
