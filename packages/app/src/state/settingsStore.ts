import { type Settings, isNewerSettings, parseSettings, serializeSettings } from '@downshift/core'
import { useSyncExternalStore } from 'react'

const KEY = 'downshift.settings'

let storageFailed = false
// Settings written by a newer Downshift: run on defaults but never save over them, so going back a version
// doesn't wipe someone's preferences.
let readOnly = false
let noticeShown = false
let notice: string | null = null
const subs = new Set<() => void>()
let settings: Settings = load()

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    readOnly = isNewerSettings(raw)
    return parseSettings(raw)
  } catch {
    storageFailed = true
    return parseSettings(null)
  }
}

function emit(): void {
  for (const cb of [...subs]) cb()
}

// Private windows and blocked site data make storage throw; say so once instead of failing silently.
function failNotice(): void {
  if (noticeShown) return
  noticeShown = true
  notice = "Your settings can't be saved in this browser, so they will reset when you close the app."
}

function applyTheme(s: Settings): void {
  const root = document.documentElement
  if (s.theme === 'system') root.removeAttribute('data-theme')
  else root.dataset.theme = s.theme
}

export function getSettings(): Settings {
  return settings
}

export function updateSettings(patch: Partial<Settings> | ((s: Settings) => Settings)): void {
  settings = typeof patch === 'function' ? patch(settings) : { ...settings, ...patch }
  applyTheme(settings)
  if (readOnly) {
    emit()
    return
  }
  try {
    localStorage.setItem(KEY, serializeSettings(settings))
  } catch {
    storageFailed = true
    failNotice()
  }
  emit()
}

export function subscribeSettings(cb: () => void): () => void {
  subs.add(cb)
  return () => subs.delete(cb)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings)
}

export function getStorageNotice(): string | null {
  return notice
}

export function dismissStorageNotice(): void {
  notice = null
  emit()
}

export function useStorageNotice(): string | null {
  return useSyncExternalStore(subscribeSettings, getStorageNotice)
}

// Another tab changed settings: pick them up so the two never overwrite each other with stale data.
window.addEventListener('storage', (e) => {
  if (e.key !== KEY && e.key !== null) return
  settings = parseSettings(e.newValue)
  applyTheme(settings)
  emit()
})

applyTheme(settings)
if (storageFailed) failNotice()
else if (readOnly) {
  noticeShown = true
  notice =
    'These settings were saved by a newer version of Downshift. Changes you make here will not be saved; update the app to keep them.'
}
