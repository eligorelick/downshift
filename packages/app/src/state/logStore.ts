import type { LogEvent } from '@downshift/core'
import { type IDBPDatabase, openDB } from 'idb'

const DB_NAME = 'downshift'
const STORE = 'events'

let dbPromise: Promise<IDBPDatabase | null> | null = null
// Used when IndexedDB is unavailable (private mode, blocked storage) so the session still works.
let memory: LogEvent[] = []

function db(): Promise<IDBPDatabase | null> {
  // openDB throws at once, not as a rejection, where indexedDB is missing, so the try is needed as well as the catch.
  dbPromise ??= (async () => {
    try {
      return await openDB(DB_NAME, 1, {
        upgrade(d) {
          d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        },
      })
    } catch {
      return null
    }
  })()
  return dbPromise
}

const subs = new Set<() => void>()

export function subscribe(cb: () => void): () => void {
  subs.add(cb)
  return () => subs.delete(cb)
}

function notify(): void {
  for (const cb of [...subs]) cb()
}

export async function add(e: LogEvent): Promise<void> {
  const d = await db()
  if (!d) {
    memory.push(e)
  } else {
    try {
      await d.add(STORE, e)
    } catch {
      memory.push(e)
    }
  }
  notify()
}

// Saves the sharpness rating on a focus event that is already logged. The session is logged when it ends,
// so a person who closes the app before answering still keeps the session; the rating is added if they answer.
export async function rateFocus(t: number, sharpness: number): Promise<void> {
  const match = (e: LogEvent) => e.type === 'focus' && e.t === t
  const d = await db()
  let saved = false
  if (d) {
    try {
      const stored = (await d.getAll(STORE)) as Array<LogEvent & { id: number }>
      const hit = stored.find(match)
      if (hit?.type === 'focus') {
        await d.put(STORE, { ...hit, sharpness })
        saved = true
      }
    } catch {
      // Fall through to the in-memory copy.
    }
  }
  if (!saved) {
    memory = memory.map((e) => (match(e) && e.type === 'focus' ? { ...e, sharpness } : e))
  }
  notify()
}

export async function all(): Promise<LogEvent[]> {
  const d = await db()
  let stored: LogEvent[] = []
  if (d) {
    try {
      stored = (await d.getAll(STORE)) as LogEvent[]
    } catch {
      stored = []
    }
  }
  return [...stored, ...memory].sort((a, b) => a.t - b.t)
}

export async function clear(): Promise<void> {
  memory = []
  const d = await db()
  try {
    await d?.clear(STORE)
  } catch {
    // Nothing more to do; the in-memory copy is already gone.
  }
  notify()
}
