import { useSyncExternalStore } from 'react'

export const PAGES = [
  'home',
  'focus',
  'workout',
  'breathe',
  'history',
  'device',
  'evidence',
  'settings',
] as const
export type PageKey = (typeof PAGES)[number]

export interface Route {
  page: PageKey
  params: URLSearchParams
}

// "#focus?start=1" -> page "focus", params start=1.
export function parseHash(hash: string): Route {
  const [name = '', query = ''] = hash.replace(/^#\/?/, '').split('?')
  // "#evidence-breathing" is a section of the Evidence page (a contents link opened in a new tab).
  const key = name.startsWith('evidence-') ? 'evidence' : name
  const page = (PAGES as readonly string[]).includes(key) ? (key as PageKey) : 'home'
  return { page, params: new URLSearchParams(query) }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parseHash(hash)
}

export function navigate(page: PageKey): void {
  location.hash = page
}
