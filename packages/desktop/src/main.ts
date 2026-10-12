import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join, normalize, resolve, sep } from 'node:path'
import {
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  app,
  ipcMain,
  nativeImage,
  protocol,
  session,
  shell,
} from 'electron'

const ORIGIN = 'app://downshift'
const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json',
  webmanifest: 'application/manifest+json',
  svg: 'image/svg+xml',
  png: 'image/png',
  ico: 'image/x-icon',
  woff2: 'font/woff2',
  map: 'application/json',
}
// Sent with every response so the page is locked down even if index.html carries no CSP.
const CSP =
  "default-src 'self' app:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
const MAX_TRAY_DATA_URL = 8192
const MAX_TRAY_PX = 64
const ALLOWED_PERMISSIONS = new Set(['bluetooth', 'notifications', 'screen-wake-lock', 'wake-lock'])

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

const distRoot = resolve(
  app.isPackaged ? join(process.resourcesPath, 'app-dist') : join(app.getAppPath(), '../app/dist'),
)
const defaultIcon = nativeImage.createFromPath(
  app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(app.getAppPath(), 'build/icon.ico'),
)

interface Device {
  id: string
  name: string
}

let win: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false
let muted = false
let remembered: Device | null = null
// The chooser callback for the current Bluetooth request, guarded so it fires at most once.
let pendingChoose: ((id: string) => void) | null = null
let offered = new Set<string>()
let toldTray = false

const stateFile = () => join(app.getPath('userData'), 'shell-state.json')

function loadState(): void {
  try {
    toldTray = JSON.parse(readFileSync(stateFile(), 'utf8')).toldTray === true
  } catch {
    toldTray = false
  }
}

function saveState(): void {
  try {
    writeFileSync(stateFile(), JSON.stringify({ toldTray }))
  } catch {
    // Worst case the notice shows again next run.
  }
}

// Answers the open chooser request with "nothing chosen" so Chromium is not left waiting.
function cancelPending(): void {
  const cb = pendingChoose
  pendingChoose = null
  offered = new Set()
  cb?.('')
}

function setDefaultTray(tooltip: unknown): void {
  tray?.setImage(defaultIcon)
  tray?.setToolTip(typeof tooltip === 'string' && tooltip ? tooltip.slice(0, 120) : 'Downshift')
}

const isAppSender = (e: Electron.IpcMainEvent) => e.senderFrame?.url.startsWith(`${ORIGIN}/`) === true

function showWindow(): void {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function navigate(hash: string): void {
  showWindow()
  win?.webContents.send('app:navigate', hash)
}

// index.html sets the theme from an inline script before first paint; allow exactly those scripts by hash.
function withInlineScriptHashes(csp: string, html: string): string {
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) =>
      `'sha256-${createHash('sha256')
        .update(m[1] ?? '')
        .digest('base64')}'`,
  )
  return `${csp}; script-src 'self' ${hashes.join(' ')}`.trim()
}

async function serve(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (url.hostname !== 'downshift') return new Response('Not found', { status: 404 })
  let rel: string
  try {
    rel = decodeURIComponent(url.pathname)
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  if (rel === '/' || rel === '') rel = '/index.html'
  const file = resolve(normalize(join(distRoot, rel)))
  // Resolve, then require the result to stay inside the dist root (path traversal guard).
  if (!file.startsWith(distRoot + sep)) return new Response('Forbidden', { status: 403 })
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file')
    const ext = file.slice(file.lastIndexOf('.') + 1).toLowerCase()
    const body = await readFile(file)
    return new Response(body, {
      headers: {
        'content-type': MIME[ext] ?? 'application/octet-stream',
        'content-security-policy': ext === 'html' ? withInlineScriptHashes(CSP, body.toString('utf8')) : CSP,
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: 'Open Downshift', click: showWindow },
    { label: 'Breathe now', click: () => navigate('#breathe') },
    { label: 'Start focus', click: () => navigate('#focus?start=1') },
    {
      label: 'Mute',
      type: 'checkbox',
      checked: muted,
      click: (item) => {
        muted = item.checked
        win?.webContents.send('app:mute', muted)
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        quitting = true
        app.quit()
      },
    },
  ])
}

function createTray(): void {
  tray = new Tray(defaultIcon)
  tray.setToolTip('Downshift')
  tray.setContextMenu(buildMenu())
  tray.on('double-click', showWindow)
}

function lockDownSession(): void {
  const ses = session.defaultSession
  const fromApp = (origin: string) => origin === ORIGIN || origin === `${ORIGIN}/`
  ses.setPermissionCheckHandler(
    (_wc, permission, origin) => ALLOWED_PERMISSIONS.has(permission) && fromApp(origin),
  )
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    const from = details.requestingUrl || wc.getURL()
    callback(ALLOWED_PERMISSIONS.has(permission) && from.startsWith(`${ORIGIN}/`))
  })
  // Heart rate devices are not expected to need a PIN, so only plain "confirm" prompts are accepted automatically.
  ses.setBluetoothPairingHandler((details, callback) => {
    callback({ confirmed: details.pairingKind === 'confirm' })
  })
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 380,
    minHeight: 600,
    show: false,
    title: 'Downshift',
    icon: defaultIcon,
    backgroundColor: '#f6f2ea',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(app.getAppPath(), 'dist/preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false,
      // No DevTools in the shipped app; they stay available when run from source.
      devTools: !app.isPackaged,
    },
  })
  const wc = win.webContents

  win.once('ready-to-show', () => win?.show())
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    win?.hide()
    if (!toldTray) {
      toldTray = true
      saveState()
      new Notification({ title: 'Downshift', body: 'Downshift is still running in the tray' }).show()
    }
  })

  win.on('closed', () => {
    cancelPending()
    win = null
  })
  // Windows logoff/shutdown must not be turned into hide-to-tray.
  win.on('session-end', () => {
    quitting = true
  })

  wc.on('select-bluetooth-device', (e, list, callback) => {
    e.preventDefault()
    // Same rule as matches() in @downshift/core: an empty name never matches, or a remembered strap
    // that advertises no name would pick any other nameless device in range.
    const name = remembered?.name.trim().toLowerCase() ?? ''
    const pick = remembered
      ? (list.find((d) => d.deviceId === remembered?.id) ??
        (name ? list.find((d) => (d.deviceName ?? '').trim().toLowerCase() === name) : undefined))
      : undefined
    if (pick) {
      pendingChoose = null
      offered = new Set()
      callback(pick.deviceId)
      return
    }
    // The event refires with a fresh callback as the scan finds more devices. The old callback is dropped
    // rather than answered, since answering it would end the request the new one belongs to.
    let done = false
    pendingChoose = (id) => {
      if (done) return
      done = true
      callback(id)
    }
    const byId = new Map<string, Device>()
    for (const d of list)
      if (!byId.has(d.deviceId))
        byId.set(d.deviceId, { id: d.deviceId, name: d.deviceName || 'Unknown device' })
    offered = new Set(byId.keys())
    wc.send('bt:devices', [...byId.values()])
  })

  const block = (e: Electron.Event, url: string) => {
    if (!url.startsWith(`${ORIGIN}/`)) e.preventDefault()
  }
  wc.on('will-navigate', block)
  wc.on('will-redirect', block)
  wc.on('will-frame-navigate', (e) => block(e, e.url))
  wc.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  void win.loadURL(`${ORIGIN}/index.html`)
}

function registerIpc(): void {
  ipcMain.on('tray:bpm', (e, dataUrl: unknown, tooltip: unknown) => {
    if (!isAppSender(e) || !tray) return
    if (dataUrl === '') {
      setDefaultTray(tooltip)
      return
    }
    if (
      typeof dataUrl !== 'string' ||
      dataUrl.length > MAX_TRAY_DATA_URL ||
      !dataUrl.startsWith('data:image/png;base64,')
    )
      return
    const img = nativeImage.createFromDataURL(dataUrl)
    const { width, height } = img.getSize()
    if (img.isEmpty() || width > MAX_TRAY_PX || height > MAX_TRAY_PX) return
    tray.setImage(img)
    if (typeof tooltip === 'string') tray.setToolTip(tooltip.slice(0, 120))
  })
  ipcMain.on('bt:remembered', (e, device: unknown) => {
    if (!isAppSender(e)) return
    const d = device as { id?: unknown; name?: unknown } | null
    remembered =
      d && typeof d.id === 'string' && typeof d.name === 'string' ? { id: d.id, name: d.name } : null
  })
  ipcMain.on('bt:choose', (e, id: unknown) => {
    if (!isAppSender(e) || !pendingChoose) return
    // A reply for a device that was never offered is stale; treat it as a cancel.
    const valid = typeof id === 'string' && offered.has(id)
    const cb = pendingChoose
    pendingChoose = null
    offered = new Set()
    cb(valid ? id : '')
  })
  ipcMain.on('app:mute', (e, mute: unknown) => {
    if (!isAppSender(e) || typeof mute !== 'boolean' || mute === muted) return
    muted = mute
    tray?.setContextMenu(buildMenu())
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showWindow)
  app.on('before-quit', () => {
    quitting = true
    cancelPending()
  })
  app.setAppUserModelId('io.github.eligorelick.downshift')
  app.whenReady().then(() => {
    loadState()
    protocol.handle('app', serve)
    lockDownSession()
    registerIpc()
    createTray()
    createWindow()
  })
  // Closing the window only hides it, so the app stays alive until Quit.
  app.on('window-all-closed', () => {})
}
