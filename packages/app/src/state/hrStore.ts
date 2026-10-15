import {
  BtLog,
  type ConnectionState,
  type HeartRateReading,
  type HeartRateSource,
  type Scenario,
  SimulatedSource,
  WebBluetoothSource,
  detectSupport,
} from '@downshift/ble'
import type { DeviceRef } from '@downshift/core'
import { useSyncExternalStore } from 'react'
import { chooseBluetoothDevice, rememberDevice, setTrayBpm } from '../platform/desktopBridge'
import { now, useNow } from './clock'
import { getSettings, updateSettings } from './settingsStore'

export interface HeartRateSnapshot {
  bpm: number | null
  contact: boolean | null
  state: ConnectionState
  device: DeviceRef | null
  lastAt: number | null
  kind: HeartRateSource['kind'] | null
  // Human-readable reason for the last 'error' or 'unsupported' state.
  detail: string | null
}

const KEEP_MS = 10 * 60 * 1000
// A tab that was asleep can wake hours later; fill at most this much so we never freeze the page.
const MAX_CATCH_UP_MS = 3 * 60 * 60 * 1000
const STEP_MS = 1000

export const btLog = new BtLog(now)

let snap: HeartRateSnapshot = {
  bpm: null,
  contact: null,
  state: 'disconnected',
  device: null,
  lastAt: null,
  kind: null,
  detail: null,
}
let buffer: HeartRateReading[] = []
let source: HeartRateSource | null = null
let unsubs: Array<() => void> = []
let held = 0
const subs = new Set<() => void>()
const readingSubs = new Set<(r: HeartRateReading) => void>()

function emit(): void {
  if (held > 0) return
  for (const cb of [...subs]) cb()
}

function set(patch: Partial<HeartRateSnapshot>): void {
  snap = { ...snap, ...patch }
  emit()
}

function onReading(r: HeartRateReading): void {
  buffer.push(r)
  const cut = r.t - KEEP_MS
  if (buffer[0] && buffer[0].t < cut) buffer = buffer.filter((x) => x.t >= cut)
  for (const cb of [...readingSubs]) cb(r)
  // The tray number would look like a real strap, so demo readings stay out of it.
  if (held === 0 && source?.kind !== 'simulated') setTrayBpm(r.bpm)
  set({ bpm: r.bpm, contact: r.contact ?? null, lastAt: r.t })
}

function attach(src: HeartRateSource): void {
  detach()
  source = src
  // Remember the device on the connect the person asked for, not on each automatic reconnect, so
  // "Forget this device" pressed while connected is not undone by the next dropout.
  let remembered = false
  unsubs = [
    src.onReading(onReading),
    src.onState((state, detail) => {
      set({ state, device: src.device, detail: detail ?? null })
      if (state === 'connected' && !remembered && src.kind === 'web-bluetooth' && src.device) {
        remembered = true
        const d = { id: src.device.id, name: src.device.name }
        updateSettings({ paired: d })
        rememberDevice(d)
      }
    }),
  ]
  set({
    kind: src.kind,
    state: src.state,
    device: src.device,
    detail: null,
    bpm: null,
    contact: null,
    lastAt: null,
  })
}

function detach(): void {
  for (const u of unsubs) u()
  unsubs = []
  source = null
  buffer = []
}

function supportEnv() {
  return {
    hasBluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    isSecureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    platform: navigator.platform,
  }
}

export function bluetoothSupport() {
  return detectSupport(supportEnv())
}

async function stopCurrent(): Promise<void> {
  const old = source
  // On desktop the device list is the app's own; answer it with "nothing chosen" so the open Bluetooth
  // request ends instead of blocking the next one. A no-op in the browser, whose chooser is modal.
  if (old?.state === 'requesting') chooseBluetoothDevice('')
  detach()
  if (old) await old.disconnect().catch(() => {})
}

// Bumped by every connect/demo/disconnect; a call that finds it changed after an await has been superseded.
let token = 0

export async function connectBluetooth(): Promise<void> {
  const mine = ++token
  const support = bluetoothSupport()
  if (!support.supported) {
    await stopCurrent()
    set({ state: 'unsupported', kind: null, device: null, detail: support.reason })
    btLog.add(`Bluetooth is not available here (${support.reason}).`)
    return
  }
  await stopCurrent()
  if (mine !== token) return
  const src = new WebBluetoothSource(navigator.bluetooth, btLog, { now })
  attach(src)
  await src.connect({ remembered: getSettings().paired })
}

export async function startDemo(scenario: Scenario): Promise<void> {
  const mine = ++token
  await stopCurrent()
  if (mine !== token) return
  let sim: SimulatedSource | null = null
  let lastT = now()
  // When time jumps (a throttled background tab, or an e2e fast-forward) the single tick would leave a
  // hole in the data, so replay the missed seconds first and sessions see an unbroken trace.
  const schedule = (fn: () => void, ms: number) =>
    window.setInterval(() => {
      const t = now()
      if (sim && t - lastT > STEP_MS * 1.5) {
        held++
        try {
          for (let x = Math.max(lastT + STEP_MS, t - MAX_CATCH_UP_MS); x <= t - STEP_MS; x += STEP_MS)
            sim.step(x)
        } finally {
          held--
        }
      }
      lastT = t
      fn()
    }, ms)
  sim = new SimulatedSource({ scenario, now, setInterval: schedule })
  attach(sim)
  lastT = now()
  await sim.connect()
}

export async function disconnect(): Promise<void> {
  token++
  await stopCurrent()
  set({ state: 'disconnected', device: null, kind: null, detail: null })
}

// For sessions that live outside React.
export function onHeartRate(cb: (r: HeartRateReading) => void): () => void {
  readingSubs.add(cb)
  return () => readingSubs.delete(cb)
}

export function recentReadings(): readonly HeartRateReading[] {
  return buffer
}

export function getHeartRate(): HeartRateSnapshot {
  return snap
}

export function subscribeHeartRate(cb: () => void): () => void {
  subs.add(cb)
  return () => subs.delete(cb)
}

// A reading counts as live while the link is up and the last value is under 15 s old (as the Focus page and
// the tray treat it), so a strap that stays connected but stops sending does not keep showing its last number.
export const STALE_MS = 15_000

export function useLiveBpm(): number | null {
  const hr = useHeartRate()
  const t = useNow(1000)
  const fresh = hr.lastAt !== null && t - hr.lastAt <= STALE_MS
  return hr.state === 'connected' && hr.contact !== false && hr.bpm !== null && fresh ? hr.bpm : null
}

export function useHeartRate(): HeartRateSnapshot {
  return useSyncExternalStore(subscribeHeartRate, getHeartRate)
}
