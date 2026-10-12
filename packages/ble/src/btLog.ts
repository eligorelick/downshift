const MAX_LINES = 500

export interface BtLogLine {
  t: number
  text: string
}

// Readable record of what Bluetooth did, shown in the Bluetooth log on the Device page.
export class BtLog {
  private lines: BtLogLine[] = []
  private subs = new Set<() => void>()

  constructor(private now: () => number = () => Date.now()) {}

  add(text: string): void {
    this.lines.push({ t: this.now(), text })
    if (this.lines.length > MAX_LINES) this.lines.splice(0, this.lines.length - MAX_LINES)
    for (const cb of [...this.subs]) cb()
  }

  get entries(): readonly BtLogLine[] {
    return [...this.lines]
  }

  subscribe(cb: () => void): () => void {
    this.subs.add(cb)
    return () => this.subs.delete(cb)
  }

  text(): string {
    return this.lines.map((l) => `${clock(l.t)}  ${l.text}`).join('\n')
  }
}

function clock(t: number): string {
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(p).join(':')
}
