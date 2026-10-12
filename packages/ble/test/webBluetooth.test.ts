import { beforeEach, describe, expect, test } from 'bun:test'
import { BtLog } from '../src/btLog'
import type { ConnectionState, HeartRateReading } from '../src/types'
import { WebBluetoothSource } from '../src/webBluetooth'
import { FakeBluetooth, FakeDevice, ManualTimers, asBluetooth, settle } from './fakeBluetooth'

let timers: ManualTimers
let log: BtLog
let dev: FakeDevice
let bt: FakeBluetooth
let src: WebBluetoothSource
let states: ConnectionState[]
let details: (string | undefined)[]
let readings: HeartRateReading[]

function make(): void {
  src = new WebBluetoothSource(asBluetooth(bt), log, {
    now: () => 5000,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  })
  src.onState((s, d) => {
    states.push(s)
    details.push(d)
  })
  src.onReading((r) => readings.push(r))
}

beforeEach(() => {
  timers = new ManualTimers()
  log = new BtLog(() => 0)
  dev = new FakeDevice('abc', 'WHOOP 4A0123')
  bt = new FakeBluetooth(dev)
  states = []
  details = []
  readings = []
  make()
})

describe('WebBluetoothSource', () => {
  test('connects through the chooser and reports readings', async () => {
    await src.connect()
    expect(src.state).toBe('connected')
    expect(src.device).toEqual({ id: 'abc', name: 'WHOOP 4A0123' })
    expect(states).toEqual(['requesting', 'connecting', 'connected'])
    expect(bt.requestCalls[0]).toEqual({
      filters: [
        { services: ['heart_rate'] },
        { namePrefix: 'WHOOP' },
        { namePrefix: 'Charge' },
        { namePrefix: 'Pixel Watch' },
      ],
      optionalServices: ['heart_rate', 'battery_service'],
    })
    dev.characteristic.emit([0, 72])
    expect(readings).toEqual([{ t: 5000, bpm: 72, contact: undefined, rrMs: undefined }])
  })

  test('logs a device with no name as unnamed, not as an empty quoted name', async () => {
    dev = new FakeDevice('xyz', '')
    bt = new FakeBluetooth(dev)
    make()
    await src.connect()
    expect(log.text()).toContain('Connecting to an unnamed device.')
    expect(log.text()).not.toContain('""')
  })

  test('passes contact and RR intervals through', async () => {
    await src.connect()
    dev.characteristic.emit([0x16, 70, 0x00, 0x04]) // contact bit, RR = 1024/1024 s
    expect(readings[0]?.contact).toBe(true)
    expect(readings[0]?.rrMs).toEqual([1000])
  })

  test('drops implausible values and logs how many', async () => {
    await src.connect()
    dev.characteristic.emit([0, 0x0a]) // 10 bpm
    dev.characteristic.emit([0, 250]) // 250 bpm
    dev.characteristic.emit([0, 0]) // 0 bpm
    expect(readings).toEqual([])
    // The first ignored value is logged with its running count.
    expect(log.text()).toContain('Ignored 1 heart rate value(s) outside 25-240 bpm.')
    dev.characteristic.emit([0, 25])
    dev.characteristic.emit([0, 240])
    expect(readings.map((r) => r.bpm)).toEqual([25, 240])
  })

  test('ignores truncated packets', async () => {
    await src.connect()
    dev.characteristic.emit([0])
    expect(readings).toEqual([])
  })

  test('reconnects after the device drops', async () => {
    await src.connect()
    dev.drop()
    await settle()
    expect(src.state).toBe('reconnecting')
    expect(timers.delays).toEqual([1000])
    await timers.fireNext()
    expect(src.state).toBe('connected')
    dev.characteristic.emit([0, 80])
    expect(readings.map((r) => r.bpm)).toEqual([80])
    expect(dev.characteristic.listenerCount('characteristicvaluechanged')).toBe(1)
  })

  test('retries with growing delays, then gives up with a plain message', async () => {
    await src.connect()
    dev.gatt.failConnects = 100
    dev.drop()
    await settle()
    const seen: number[] = []
    for (let i = 0; i < 12; i++) {
      const ms = await timers.fireNext()
      if (ms === null) break
      seen.push(ms)
    }
    expect(seen).toEqual([1, 2, 5, 10, 30, 30, 30, 30, 30, 30].map((s) => s * 1000))
    expect(src.state).toBe('error')
    expect(details[details.length - 1]).toBe('Lost the device. Choose it again on the Device page.')
  })

  test('user disconnect does not reconnect', async () => {
    await src.connect()
    await src.disconnect()
    await settle()
    expect(src.state).toBe('disconnected')
    expect(timers.count).toBe(0)
    expect(states[states.length - 1]).toBe('disconnected')
    dev.characteristic.emit([0, 72])
    expect(readings).toEqual([])
  })

  test('user disconnect during reconnect cancels the retry', async () => {
    await src.connect()
    dev.drop()
    await settle()
    expect(timers.count).toBe(1)
    await src.disconnect()
    expect(timers.count).toBe(0)
    expect(src.state).toBe('disconnected')
  })

  test('cancelled chooser goes back to disconnected without an error', async () => {
    bt.chooserDevice = null
    await src.connect()
    expect(src.state).toBe('disconnected')
    expect(states).toEqual(['requesting', 'disconnected'])
    expect(details.every((d) => d === undefined)).toBe(true)
  })

  test('disconnecting while the remembered device is looked up does not open the chooser', async () => {
    let release = (): void => {}
    bt.getDevicesGate = new Promise((r) => {
      release = r
    })
    bt.known = []
    const pending = src.connect({ remembered: { id: 'gone', name: 'Old strap' } })
    await src.disconnect()
    release()
    await pending
    await settle()
    expect(bt.requestCalls.length).toBe(0)
    expect(src.state).toBe('disconnected')
    // Nothing after the disconnect suggests the attempt carried on.
    expect(log.text()).not.toContain('remembered device')
    expect(log.text()).not.toContain('Asking the browser')
  })

  test('remembered device found via getDevices skips the chooser', async () => {
    bt.known = [new FakeDevice('zzz', 'Other'), dev]
    await src.connect({ remembered: { id: 'abc', name: 'WHOOP 4A0123' } })
    expect(bt.requestCalls.length).toBe(0)
    expect(src.state).toBe('connected')
  })

  test('remembered device matches by name when the id changed', async () => {
    bt.known = [dev]
    await src.connect({ remembered: { id: 'old-id', name: 'whoop 4a0123' } })
    expect(bt.requestCalls.length).toBe(0)
    expect(src.state).toBe('connected')
  })

  test('falls back to the chooser when the remembered device is not found', async () => {
    bt.known = []
    await src.connect({ remembered: { id: 'abc', name: 'WHOOP 4A0123' } })
    expect(bt.requestCalls.length).toBe(1)
    expect(src.state).toBe('connected')
  })

  test('falls back to the chooser when getDevices does not exist', async () => {
    bt.withGetDevices = false
    make()
    await src.connect({ remembered: { id: 'abc', name: 'WHOOP 4A0123' } })
    expect(bt.requestCalls.length).toBe(1)
  })

  test('maps errors to plain messages', async () => {
    for (const name of ['SecurityError', 'NetworkError', 'NotSupportedError']) {
      bt.requestError = new DOMException('x', name)
      make()
      await src.connect()
      expect(src.state).toBe('error')
      expect(details[details.length - 1]).toBeTruthy()
      expect(details[details.length - 1]).not.toContain('DOMException')
    }
  })

  test('a failed first connection is an error, not a reconnect loop', async () => {
    dev.gatt.failConnects = 1
    await src.connect()
    expect(src.state).toBe('error')
    expect(timers.count).toBe(0)
  })

  test('a device without a heart rate service is reported', async () => {
    dev.gatt.hasHeartRateService = false
    await src.connect()
    expect(src.state).toBe('error')
    expect(details[details.length - 1]).toContain('heart rate')
  })

  test('disconnect while gatt.connect is pending leaves nothing connected', async () => {
    let release: () => void = () => {}
    dev.gatt.connectGate = new Promise<void>((r) => {
      release = r
    })
    const pending = src.connect()
    await settle()
    await src.disconnect()
    release()
    await pending
    await settle()
    expect(src.state).toBe('disconnected')
    expect(dev.gatt.connected).toBe(false)
    expect(dev.characteristic.notifying).toBe(false)
    dev.characteristic.emit([0, 72])
    expect(readings).toEqual([])
  })

  test('a failed first connection lets go of the device and never reconnects', async () => {
    dev.gatt.hasHeartRateService = false
    await src.connect()
    expect(src.state).toBe('error')
    expect(dev.gatt.connected).toBe(false)
    expect(src.device).toBeNull()
    dev.drop()
    await settle()
    expect(timers.count).toBe(0)
    expect(src.state).toBe('error')
  })

  test('a second drop while retrying does not start another retry chain', async () => {
    await src.connect()
    dev.drop()
    dev.drop()
    await settle()
    expect(timers.count).toBe(1)
  })

  test('connecting again tears down the previous connection', async () => {
    await src.connect()
    await src.connect()
    await settle()
    expect(src.state).toBe('connected')
    expect(dev.characteristic.listenerCount('characteristicvaluechanged')).toBe(1)
    expect(dev.listenerCount('gattserverdisconnected')).toBe(1)
    expect(timers.count).toBe(0)
  })

  test('a second connect on the same device while the first is in flight keeps the new connection', async () => {
    let release: () => void = () => {}
    dev.gatt.connectGate = new Promise<void>((r) => {
      release = r
    })
    const first = src.connect()
    await settle()
    const second = src.connect()
    await settle()
    release()
    await Promise.all([first, second])
    await settle()
    expect(src.state).toBe('connected')
    expect(dev.gatt.connected).toBe(true)
    expect(dev.characteristic.listenerCount('characteristicvaluechanged')).toBe(1)
    dev.characteristic.emit([0, 72])
    expect(readings.length).toBe(1)
  })

  test('a throwing listener does not stop the others and is logged', async () => {
    const seen: number[] = []
    src.onReading(() => {
      throw new Error('boom')
    })
    src.onState(() => {
      throw new Error('boom2')
    })
    src.onReading((r) => seen.push(r.bpm))
    await src.connect()
    dev.characteristic.emit([0, 72])
    expect(seen).toEqual([72])
    expect(src.state).toBe('connected')
    expect(states).toEqual(['requesting', 'connecting', 'connected'])
    expect(log.entries.some((e) => e.text.includes('listener failed'))).toBe(true)
  })

  test('the ignored-value counter restarts on each connection', async () => {
    await src.connect()
    dev.characteristic.emit([0, 10])
    await src.connect()
    const before = log.entries.length
    dev.characteristic.emit([0, 10])
    expect(log.entries.slice(before).some((e) => e.text.startsWith('Ignored 1 '))).toBe(true)
  })

  test('NotFoundError that is not a cancel says Bluetooth is off or missing', async () => {
    bt.requestError = new DOMException('Bluetooth adapter not available.', 'NotFoundError')
    await src.connect()
    expect(src.state).toBe('error')
    expect(details[details.length - 1]).toBe('Bluetooth is off or this device has no Bluetooth adapter.')
  })
})
