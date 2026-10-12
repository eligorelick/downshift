import { describe, expect, test } from 'bun:test'
import { BtLog } from '../src/btLog'

describe('BtLog', () => {
  test('keeps the last 500 lines', () => {
    const log = new BtLog(() => 0)
    for (let i = 0; i < 520; i++) log.add(`line ${i}`)
    expect(log.entries.length).toBe(500)
    expect(log.entries[0]?.text).toBe('line 20')
    expect(log.entries.at(-1)?.text).toBe('line 519')
  })

  // The Device page's log view relies on this to notice new lines once the log is full.
  test('the newest line is the same object between reads and a new object after each add, even when full', () => {
    const log = new BtLog(() => 0)
    for (let i = 0; i < 500; i++) log.add(`line ${i}`)
    const before = log.entries.at(-1)
    expect(log.entries.at(-1)).toBe(before)
    log.add('one more')
    expect(log.entries.length).toBe(500)
    expect(log.entries.at(-1)).not.toBe(before)
  })
})
