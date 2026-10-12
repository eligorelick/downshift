import { contextBridge, ipcRenderer } from 'electron'

// Mirrors DownshiftDesktop in packages/app/src/platform/desktopBridge.ts.
// Only these named calls cross the bridge; ipcRenderer itself is never exposed.
function subscribe<T>(channel: string, cb: (value: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, value: T) => cb(value)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

contextBridge.exposeInMainWorld('downshiftDesktop', {
  isDesktop: true,
  onNavigate: (cb: (hash: string) => void) => subscribe('app:navigate', cb),
  setTrayBpm: (dataUrl: string, tooltip: string) => ipcRenderer.send('tray:bpm', dataUrl, tooltip),
  rememberDevice: (device: { id: string; name: string } | null) => ipcRenderer.send('bt:remembered', device),
  onBluetoothDevices: (cb: (list: { id: string; name: string }[]) => void) => subscribe('bt:devices', cb),
  chooseBluetoothDevice: (id: string) => ipcRenderer.send('bt:choose', id),
  setMute: (mute: boolean) => ipcRenderer.send('app:mute', mute),
  onMute: (cb: (mute: boolean) => void) => subscribe('app:mute', cb),
})
