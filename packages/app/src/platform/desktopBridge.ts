import type { DeviceRef } from '@downshift/core'

export interface BluetoothChoice {
  id: string
  name: string
}

// Exposed by the Electron preload. Absent in the browser, where every call here is a no-op.
export interface DownshiftDesktop {
  isDesktop: true
  onNavigate(cb: (hash: string) => void): () => void
  setTrayBpm(dataUrl: string, tooltip: string): void
  rememberDevice(device: DeviceRef | null): void
  onBluetoothDevices(cb: (list: BluetoothChoice[]) => void): () => void
  chooseBluetoothDevice(id: string): void
  setMute(mute: boolean): void
  onMute(cb: (mute: boolean) => void): () => void
}

declare global {
  interface Window {
    downshiftDesktop?: DownshiftDesktop
  }
}

const none = () => {}

export const isDesktop = (): boolean => window.downshiftDesktop?.isDesktop === true

export function onNavigate(cb: (hash: string) => void): () => void {
  return window.downshiftDesktop?.onNavigate(cb) ?? none
}

export function rememberDevice(device: DeviceRef | null): void {
  window.downshiftDesktop?.rememberDevice(device)
}

export function onBluetoothDevices(cb: (list: BluetoothChoice[]) => void): () => void {
  return window.downshiftDesktop?.onBluetoothDevices(cb) ?? none
}

export function chooseBluetoothDevice(id: string): void {
  window.downshiftDesktop?.chooseBluetoothDevice(id)
}

export function setMute(mute: boolean): void {
  window.downshiftDesktop?.setMute(mute)
}

export function onMute(cb: (mute: boolean) => void): () => void {
  return window.downshiftDesktop?.onMute(cb) ?? none
}

let lastTray = 0

// Draws the bpm into a 32x32 icon for the tray; at most once a second.
export function setTrayBpm(bpm: number | null): void {
  const d = window.downshiftDesktop
  const at = Date.now()
  // A null (device gone) always goes through so the default icon is restored promptly.
  if (!d || (bpm !== null && at - lastTray < 1000)) return
  lastTray = at
  if (bpm === null) {
    // Empty icon tells the shell to restore its default.
    d.setTrayBpm('', 'Downshift')
    return
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#0f5f5c'
  ctx.fillRect(0, 0, 32, 32)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(bpm), 16, 17, 30)
  d.setTrayBpm(canvas.toDataURL('image/png'), `Downshift ${bpm} bpm`)
}
