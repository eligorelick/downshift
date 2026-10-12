import { describe, expect, test } from 'bun:test'
import { parseHrPacket } from '../src/hrPacket'

const p = (...b: number[]) => parseHrPacket(new Uint8Array(b))

describe('parseHrPacket', () => {
  test('8-bit bpm', () => expect(p(0x00, 72)?.bpm).toBe(72))
  test('16-bit bpm', () => expect(p(0x01, 0x2c, 0x01)?.bpm).toBe(300))
  test('too short', () => {
    expect(p(0x00)).toBeNull()
    expect(p(0x01, 0x40)).toBeNull()
    expect(p()).toBeNull()
  })
  test('a truncated energy field is dropped and the heart rate kept', () => {
    expect(p(0x08, 70)).toEqual({ bpm: 70, contact: undefined, rrMs: [] })
    expect(p(0x08, 70, 1)).toEqual({ bpm: 70, contact: undefined, rrMs: [] })
  })
  test('contact supported and detected', () => expect(p(0x06, 70)?.contact).toBe(true))
  test('contact supported, not detected', () => expect(p(0x04, 70)?.contact).toBe(false))
  test('contact not supported → undefined', () => expect(p(0x02, 70)?.contact).toBeUndefined())
  test('energy then RR', () => {
    const r = p(0x18, 70, 0x10, 0x00, 0x00, 0x04, 0x00, 0x02)
    expect(r?.energyKj).toBe(16)
    expect(r?.rrMs).toEqual([1000, 500])
  })
  test('RR without energy', () => expect(p(0x10, 60, 0x00, 0x04)?.rrMs).toEqual([1000]))
  test('odd trailing RR byte ignored', () => expect(p(0x10, 60, 0x00, 0x04, 0x01)?.rrMs).toEqual([1000]))
  test('accepts DataView', () =>
    expect(parseHrPacket(new DataView(new Uint8Array([0, 65]).buffer))?.bpm).toBe(65))
})
