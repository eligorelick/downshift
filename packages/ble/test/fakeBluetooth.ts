// Minimal in-memory Bluetooth for tests. No real radio is ever touched.
type Listener = (ev: unknown) => void

class Emitter {
  private map = new Map<string, Set<Listener>>()
  addEventListener(type: string, cb: Listener): void {
    if (!this.map.has(type)) this.map.set(type, new Set())
    this.map.get(type)?.add(cb)
  }
  removeEventListener(type: string, cb: Listener): void {
    this.map.get(type)?.delete(cb)
  }
  protected fire(type: string): void {
    for (const cb of [...(this.map.get(type) ?? [])]) cb({ target: this })
  }
  listenerCount(type: string): number {
    return this.map.get(type)?.size ?? 0
  }
}

export class FakeCharacteristic extends Emitter {
  value: DataView | null = null
  notifying = false
  async startNotifications(): Promise<this> {
    this.notifying = true
    return this
  }
  emit(bytes: number[]): void {
    this.value = new DataView(new Uint8Array(bytes).buffer)
    this.fire('characteristicvaluechanged')
  }
}

export class FakeGatt {
  connected = false
  connectCalls = 0
  // Number of upcoming connect() calls that should fail.
  failConnects = 0
  hasHeartRateService = true
  // When set, connect() waits for it, to model a slow connection.
  connectGate: Promise<void> | null = null
  constructor(
    private device: FakeDevice,
    private characteristic: FakeCharacteristic,
  ) {}
  async connect(): Promise<this> {
    this.connectCalls++
    if (this.connectGate) await this.connectGate
    if (this.failConnects > 0) {
      this.failConnects--
      throw new DOMException('GATT operation failed', 'NetworkError')
    }
    this.connected = true
    return this
  }
  disconnect(): void {
    this.connected = false
    // Like Chrome, the event arrives after disconnect() returns.
    queueMicrotask(() => this.device.notifyDisconnected())
  }
  async getPrimaryService(): Promise<{ getCharacteristic: () => Promise<FakeCharacteristic> }> {
    if (!this.hasHeartRateService) throw new DOMException('No services found', 'NotFoundError')
    return { getCharacteristic: async () => this.characteristic }
  }
}

export class FakeDevice extends Emitter {
  readonly characteristic = new FakeCharacteristic()
  readonly gatt: FakeGatt
  constructor(
    public id: string,
    public name: string,
  ) {
    super()
    this.gatt = new FakeGatt(this, this.characteristic)
  }
  notifyDisconnected(): void {
    this.fire('gattserverdisconnected')
  }
  // Simulates the strap going out of range.
  drop(): void {
    this.gatt.connected = false
    this.notifyDisconnected()
  }
}

export class FakeBluetooth {
  requestCalls: unknown[] = []
  requestError: DOMException | null = null
  known: FakeDevice[] = []
  withGetDevices = true
  // When set, getDevices waits for it, so a test can act while the lookup is pending.
  getDevicesGate: Promise<void> | null = null
  constructor(public chooserDevice: FakeDevice | null = null) {}
  async requestDevice(options: unknown): Promise<FakeDevice> {
    this.requestCalls.push(options)
    if (this.requestError) throw this.requestError
    if (!this.chooserDevice)
      throw new DOMException('User cancelled the requestDevice() chooser.', 'NotFoundError')
    return this.chooserDevice
  }
  async getDevices(): Promise<FakeDevice[]> {
    if (this.getDevicesGate) await this.getDevicesGate
    return this.known
  }
}

// Returns a view without getDevices when the browser lacks it.
export function asBluetooth(fake: FakeBluetooth): Bluetooth {
  if (!fake.withGetDevices) {
    return {
      requestDevice: (o: unknown) => fake.requestDevice(o),
    } as unknown as Bluetooth
  }
  return fake as unknown as Bluetooth
}

// Timers that only fire when the test says so.
export class ManualTimers {
  private next = 1
  private pending = new Map<number, { fn: () => void; ms: number }>()
  setTimeout = (fn: () => void, ms: number): unknown => {
    const id = this.next++
    this.pending.set(id, { fn, ms })
    return id
  }
  clearTimeout = (h: unknown): void => {
    this.pending.delete(h as number)
  }
  get delays(): number[] {
    return [...this.pending.values()].map((p) => p.ms)
  }
  get count(): number {
    return this.pending.size
  }
  // Fires the oldest pending timer and lets its async work settle.
  async fireNext(): Promise<number | null> {
    const first = [...this.pending.entries()][0]
    if (!first) return null
    this.pending.delete(first[0])
    first[1].fn()
    await settle()
    return first[1].ms
  }
}

export async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}
