import type { Page } from '@playwright/test'

interface NativeHeartRateFixture {
  emit(bpm: number, contact?: boolean, copies?: number): void
  advance(ms: number): void
  stream(seconds: number, bpm: number, contact?: boolean, intervalMs?: number, copies?: number): void
  drop(): void
}

declare global {
  interface Window {
    __nativeHrFixture: NativeHeartRateFixture
  }
}

// Only the browser's Bluetooth boundary is replaced. Packets still pass through WebBluetoothSource,
// parseHrPacket, hrStore and the companion controller; this fixture never imports application internals.
export async function nativeBluetoothPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Timers retain their normal cadence. A fixed Date.now plus the existing app offset makes individual
    // packet timestamps exact, including intentional duplicates, while long traces take one evaluate call.
    const epoch = Date.UTC(2026, 9, 15, 12, 0, 0)
    Date.now = () => epoch
    window.__downshiftClock = { offset: 0 }
    if (!localStorage.getItem('downshift.settings')) {
      localStorage.setItem('downshift.settings', JSON.stringify({ version: 1, welcomed: true }))
    }

    class Characteristic extends EventTarget {
      value: DataView | null = null

      async startNotifications(): Promise<this> {
        return this
      }

      emit(bpm: number, contact: boolean | undefined): void {
        const contactFlags = contact === undefined ? 0 : contact ? 0x06 : 0x04
        const bytes =
          bpm > 255
            ? new Uint8Array([contactFlags | 0x01, bpm & 0xff, (bpm >> 8) & 0xff])
            : new Uint8Array([contactFlags, bpm])
        this.value = new DataView(bytes.buffer)
        this.dispatchEvent(new Event('characteristicvaluechanged'))
      }
    }

    const characteristic = new Characteristic()
    let available = true
    const device = new EventTarget()
    const gatt = {
      connected: false,
      async connect() {
        if (!available) throw new DOMException('Device is out of range', 'NetworkError')
        this.connected = true
        return this
      },
      disconnect() {
        const connected = this.connected
        this.connected = false
        if (connected) queueMicrotask(() => device.dispatchEvent(new Event('gattserverdisconnected')))
      },
      async getPrimaryService(service: string) {
        if (service !== 'heart_rate') throw new DOMException('No such service', 'NotFoundError')
        return {
          async getCharacteristic(name: string) {
            if (name !== 'heart_rate_measurement') {
              throw new DOMException('No such characteristic', 'NotFoundError')
            }
            return characteristic
          },
        }
      },
    }
    Object.assign(device, { id: 'companion-native-strap', name: 'Companion test strap', gatt })
    Object.defineProperty(navigator, 'bluetooth', {
      configurable: true,
      value: {
        async requestDevice() {
          return device
        },
        async getDevices() {
          return [device]
        },
      },
    })

    function advance(ms: number): void {
      if (window.__downshiftClock) window.__downshiftClock.offset += ms
      document.dispatchEvent(new Event('visibilitychange'))
    }

    function emit(bpm: number, contact?: boolean, copies = 1): void {
      for (let copy = 0; copy < copies; copy++) characteristic.emit(bpm, contact)
    }

    window.__nativeHrFixture = {
      emit,
      advance,
      stream(seconds, bpm, contact, intervalMs = 1000, copies = 1) {
        for (let elapsed = 0; elapsed < seconds * 1000; elapsed += intervalMs) {
          advance(Math.min(intervalMs, seconds * 1000 - elapsed))
          emit(bpm, contact, copies)
        }
      },
      drop() {
        available = false
        gatt.connected = false
        device.dispatchEvent(new Event('gattserverdisconnected'))
      },
    }
  })
  await page.goto('/')
}

export async function nativeSample(
  page: Page,
  bpm: number,
  contact: boolean | undefined = true,
  advanceMs = 1000,
): Promise<void> {
  await page.evaluate(
    (sample) => {
      window.__nativeHrFixture.advance(sample.advanceMs)
      window.__nativeHrFixture.emit(sample.bpm, sample.contact)
    },
    { bpm, contact, advanceMs },
  )
}

export async function nativeStream(
  page: Page,
  seconds: number,
  bpm: number,
  options: { contact?: boolean; intervalMs?: number; copies?: number } = {},
): Promise<void> {
  await page.evaluate(
    (trace) => {
      window.__nativeHrFixture.stream(trace.seconds, trace.bpm, trace.contact, trace.intervalMs, trace.copies)
    },
    { seconds, bpm, contact: true, intervalMs: 1000, copies: 1, ...options },
  )
}

export async function nativeAdvance(page: Page, seconds: number): Promise<void> {
  await page.evaluate((ms) => window.__nativeHrFixture.advance(ms), seconds * 1000)
}
