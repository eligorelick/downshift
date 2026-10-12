/// <reference types="bun" />
import { afterEach, describe, expect, test } from 'bun:test'
import { askNotifyPermission } from '../src/platform/notifyPermission'

// bun has no window or Notification, so each test installs a stub and removes it afterwards.
const g = globalThis as Record<string, unknown>

function stubNotification(permission: NotificationPermission): { asked: () => number } {
  let asked = 0
  g.window = globalThis
  g.Notification = {
    permission,
    requestPermission: async () => {
      asked++
      return 'granted' as NotificationPermission
    },
  }
  return { asked: () => asked }
}

afterEach(() => {
  g.Notification = undefined
  g.window = undefined
  Reflect.deleteProperty(g, 'Notification')
  Reflect.deleteProperty(g, 'window')
})

describe('askNotifyPermission', () => {
  test('asks when the permission is still undecided', () => {
    const n = stubNotification('default')
    askNotifyPermission()
    expect(n.asked()).toBe(1)
  })

  test('does not ask again once granted or denied', () => {
    for (const p of ['granted', 'denied'] as const) {
      const n = stubNotification(p)
      askNotifyPermission()
      expect(n.asked()).toBe(0)
    }
  })

  test('does nothing where the Notification API does not exist', () => {
    g.window = globalThis
    expect(() => askNotifyPermission()).not.toThrow()
  })
})
