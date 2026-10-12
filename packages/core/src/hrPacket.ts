export interface HrPacket {
  bpm: number
  contact?: boolean
  energyKj?: number
  rrMs: number[]
}

// Bluetooth Heart Rate Measurement (0x2A37). Returns null when the heart rate field itself is truncated; a
// truncated energy or RR field is dropped and the heart rate kept.
export function parseHrPacket(data: DataView | Uint8Array): HrPacket | null {
  const v = data instanceof DataView ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : data
  if (v.length < 2) return null
  const flags = v[0] as number
  let i: number
  let bpm: number
  if (flags & 0x01) {
    if (v.length < 3) return null
    bpm = (v[1] as number) | ((v[2] as number) << 8)
    i = 3
  } else {
    bpm = v[1] as number
    i = 2
  }

  // Bit 2 says the sensor can report skin contact, bit 1 says whether it has it.
  const contact = flags & 0x04 ? Boolean(flags & 0x02) : undefined

  let energyKj: number | undefined
  if (flags & 0x08) {
    if (v.length < i + 2) return { bpm, contact, rrMs: [] }
    energyKj = (v[i] as number) | ((v[i + 1] as number) << 8)
    i += 2
  }

  // RR values come in 1/1024 s units; convert to ms with one decimal.
  const rrMs: number[] = []
  if (flags & 0x10) {
    for (; i + 1 < v.length; i += 2) {
      const raw = (v[i] as number) | ((v[i + 1] as number) << 8)
      rrMs.push(Math.round(((raw * 1000) / 1024) * 10) / 10)
    }
  }
  return { bpm, contact, energyKj, rrMs }
}
