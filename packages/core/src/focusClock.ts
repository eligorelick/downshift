import type { Preset } from './presets'

export type FocusPhase = 'off' | 'work' | 'breakDue' | 'break' | 'backDue'
export type FocusEvent = 'none' | 'headsUp' | 'breakDue' | 'breakOver'

const MIN = 60000

// Runs a focus session: work block, short break, repeat, with a long break after the block that brings
// worked time to the preset's mark (100 minutes). Lengths come from the preset; see presets.ts.
export class FocusClock {
  static readonly HEADS_UP_MS = 120_000
  static readonly SNOOZE_MS = 300_000
  static readonly EXTEND_MS = 300_000
  static readonly MAX_SNOOZES = 2

  phase: FocusPhase = 'off'
  blocks = 0 // blocks finished
  workedMs = 0 // total focus time this session
  snoozes = 0
  breakIsLong = false
  breakMinutes = 0

  private workedSinceLong = 0
  private blockStart = 0
  private blockEnd = 0
  private breakEnd = 0
  private headsUpSent = false
  private extended = false

  constructor(
    private getPreset: () => Preset,
    private getBlockMin: () => number,
  ) {}

  get canSnooze(): boolean {
    return this.snoozes < FocusClock.MAX_SNOOZES
  }
  get canExtend(): boolean {
    return !this.extended
  }
  get blockNumber(): number {
    return this.blocks + 1
  }

  start(now: number): void {
    this.blocks = 0
    this.workedMs = 0
    this.workedSinceLong = 0
    this.beginBlock(now)
  }

  private beginBlock(now: number): void {
    this.blockStart = now
    this.blockEnd = now + this.getBlockMin() * MIN
    this.snoozes = 0
    this.headsUpSent = false
    this.phase = 'work'
  }

  private planBreak(now: number): void {
    const preset = this.getPreset()
    const sinceLong = this.workedSinceLong + (now - this.blockStart)
    this.breakIsLong = sinceLong >= preset.longAfterWorkedMin * MIN
    this.breakMinutes = this.breakIsLong ? preset.longBreakMin : preset.shortBreakMin(this.getBlockMin())
  }

  tick(now: number): FocusEvent {
    if (this.phase === 'work') {
      if (now >= this.blockEnd) {
        this.planBreak(now)
        this.phase = 'breakDue'
        return 'breakDue'
      }
      if (!this.headsUpSent && now >= this.blockEnd - FocusClock.HEADS_UP_MS) {
        this.headsUpSent = true
        return 'headsUp'
      }
    } else if (this.phase === 'break' && now >= this.breakEnd) {
      this.phase = 'backDue'
      return 'breakOver'
    }
    return 'none'
  }

  // "Five more minutes" on a break prompt. `counted` is false when the prompt was simply closed.
  snooze(now: number, counted: boolean): void {
    if (this.phase !== 'breakDue' && this.phase !== 'work') return
    if (counted) this.snoozes++
    this.blockEnd = now + FocusClock.SNOOZE_MS
    this.headsUpSent = true
    this.phase = 'work'
  }

  beginBreak(now: number): void {
    if (this.phase !== 'work' && this.phase !== 'breakDue') return
    this.planBreak(now)
    const worked = now - this.blockStart
    this.workedMs += worked
    this.workedSinceLong += worked
    this.blocks++
    this.breakEnd = now + this.breakMinutes * MIN
    this.extended = false
    this.phase = 'break'
  }

  extendBreak(now: number): void {
    if (this.phase !== 'backDue' && this.phase !== 'break') return
    this.extended = true
    this.breakEnd = Math.max(now, this.breakEnd) + FocusClock.EXTEND_MS
    this.phase = 'break'
  }

  nextBlock(now: number): void {
    if (this.phase !== 'break' && this.phase !== 'backDue') return
    if (this.breakIsLong) this.workedSinceLong = 0
    this.beginBlock(now)
  }

  stop(now: number): void {
    if (this.phase === 'work' || this.phase === 'breakDue') {
      this.workedMs += now - this.blockStart
      if (now - this.blockStart >= MIN) this.blocks++
    }
    this.phase = 'off'
  }

  // Milliseconds left in the current block or break; zero when something is due.
  remaining(now: number): number {
    if (this.phase === 'work') return Math.max(0, this.blockEnd - now)
    if (this.phase === 'break') return Math.max(0, this.breakEnd - now)
    return 0
  }

  // When the current block began, so callers can look at heart rate over just this block.
  blockStartedAt(): number {
    return this.blockStart
  }
}
