/// <reference types="bun" />
import { beforeEach, describe, expect, test } from 'bun:test'
import type { LogEvent } from '@downshift/core'
import { add, all, clear, rateFocus } from '../src/state/logStore'

// bun has no IndexedDB, so the store runs on its in-memory fallback, which is also what the app uses when
// storage is blocked. The IndexedDB path of rateFocus is covered by the e2e tests.
const T = Date.UTC(2026, 9, 10, 9, 0, 0)

const focus = (t: number, sharpness: number | null = null): LogEvent => ({
  type: 'focus',
  t,
  preset: 'work',
  blocks: 1,
  focusMs: 1_500_000,
  endedAt: t + 1_500_000,
  sharpness,
})

beforeEach(async () => {
  expect(typeof indexedDB).toBe('undefined')
  await clear()
})

describe('rateFocus', () => {
  test('saves the rating on the focus event that started at t', async () => {
    await add(focus(T))
    await add(focus(T + 3_600_000))
    await rateFocus(T, 4)
    const [a, b] = await all()
    expect(a).toMatchObject({ type: 'focus', t: T, sharpness: 4 })
    expect(b).toMatchObject({ type: 'focus', t: T + 3_600_000, sharpness: null })
  })

  test('rating a session that is not in the log changes nothing', async () => {
    await add(focus(T))
    await rateFocus(T + 1, 5)
    expect(await all()).toEqual([focus(T)])
  })

  test('rating an empty log is a no-op', async () => {
    await rateFocus(T, 3)
    expect(await all()).toEqual([])
  })

  test('rating again overwrites the earlier rating', async () => {
    await add(focus(T, 2))
    await rateFocus(T, 5)
    expect((await all())[0]).toMatchObject({ sharpness: 5 })
  })

  test('only a focus event is touched, not another event at the same time', async () => {
    const brk: LogEvent = { type: 'break', t: T, minutes: 5, long: false, feeling: null, suggestion: 'rest' }
    await add(brk)
    await rateFocus(T, 4)
    expect(await all()).toEqual([brk])
  })
})
