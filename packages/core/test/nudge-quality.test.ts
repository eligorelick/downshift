import { describe, expect, test } from 'bun:test'
import { NudgeDetector } from '../src/nudge'
import { defaultSettings } from '../src/settings'

describe('NudgeDetector sample quality', () => {
  test('duplicate timestamps cannot make a sparsely sampled minute usable', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)

    for (let seconds = 0; seconds < 60; seconds += 3) {
      detector.push(seconds * 1000, 70)
      expect(detector.push(seconds * 1000, 70).valid).toBe(false)
      expect(detector.push(seconds * 1000, 70).valid).toBe(false)
    }
    detector.push(60000, 70)

    expect(detector.minuteMediansSince(0)).toEqual([])
  })

  test('a gap over fifteen seconds invalidates its minute despite enough samples on either side', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)

    for (let seconds = 0; seconds < 20; seconds++) detector.push(seconds * 1000, 70)
    for (let seconds = 40; seconds <= 60; seconds++) detector.push(seconds * 1000, 70)

    expect(detector.minuteMediansSince(0)).toEqual([])

    for (let seconds = 61; seconds <= 120; seconds++) detector.push(seconds * 1000, 70)
    expect(detector.minuteMediansSince(0)).toEqual([70])
  })

  test('a gap of exactly fifteen seconds preserves a sufficiently sampled minute', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)
    for (let seconds = 0; seconds < 20; seconds++) detector.push(seconds * 1000, 70)
    for (let seconds = 34; seconds <= 60; seconds++) detector.push(seconds * 1000, 70)

    expect(detector.minuteMediansSince(0)).toEqual([70])
  })

  test('a gap inside the fifth raised minute prevents a breathing nudge and restarts the run', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)
    const dues: string[] = []
    for (let seconds = 0; seconds < 25 * 60 + 20; seconds++) {
      const bpm = 70 + Math.min(18, Math.max(0, Math.floor((seconds - 20 * 60) * 0.3)))
      if (detector.push(seconds * 1000, bpm).due !== 'none') dues.push(String(seconds))
    }
    for (let seconds = 25 * 60 + 40; seconds <= 26 * 60; seconds++) {
      if (detector.push(seconds * 1000, 88).due !== 'none') dues.push(String(seconds))
    }

    expect(dues).toEqual([])
    expect(detector.last.runMinutes).toBe(0)

    for (let seconds = 26 * 60 + 1; seconds <= 27 * 60; seconds++) detector.push(seconds * 1000, 88)
    expect(detector.last.runMinutes).toBe(1)
  })

  test('a gap inside the tenth high minute prevents a check-in and restarts the high run', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)

    for (let seconds = 0; seconds < 9 * 60 + 20; seconds++) detector.push(seconds * 1000, 136)
    for (let seconds = 9 * 60 + 40; seconds < 10 * 60; seconds++) detector.push(seconds * 1000, 136)

    const closed = detector.push(10 * 60000, 136)
    expect(closed.due).toBe('none')
    expect(closed.highMinutes).toBe(0)

    for (let seconds = 10 * 60 + 1; seconds <= 11 * 60; seconds++) {
      expect(detector.push(seconds * 1000, 136).due).toBe('none')
    }
    expect(detector.last.highMinutes).toBe(1)

    const dues: string[] = []
    for (let seconds = 11 * 60 + 1; seconds <= 20 * 60; seconds++) {
      const due = detector.push(seconds * 1000, 136).due
      if (due !== 'none') dues.push(`${seconds}:${due}`)
    }
    expect(dues).toEqual(['1200:high'])
  })

  test('a delayed sample after a gap cannot close an old high minute into a check-in', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)
    for (let seconds = 0; seconds < 10 * 60; seconds++) detector.push(seconds * 1000, 136)

    const resumed = detector.push(10 * 60000 + 20000, 136)
    expect(resumed.due).toBe('none')
    expect(resumed.highMinutes).toBe(0)

    for (let seconds = 10 * 60 + 21; seconds <= 11 * 60; seconds++) {
      expect(detector.push(seconds * 1000, 136).due).toBe('none')
    }
    expect(detector.last.highMinutes).toBe(0)
  })

  test('an HR change across a gap does not carry old smoothing into the jump heuristic', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)
    for (let seconds = 0; seconds < 10; seconds++) detector.push(seconds * 1000, 70)
    for (let seconds = 26; seconds <= 35; seconds++) detector.push(seconds * 1000, 100)

    expect(detector.last.holdOff).toBe(false)
  })
})

describe('NudgeDetector measured feedback', () => {
  test('reports the closed usable minute median with the minute start time', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(120000, 0)
    for (let seconds = 120; seconds < 180; seconds++) {
      detector.push(seconds * 1000, seconds < 150 ? 68 : 72)
    }
    expect(detector.last.lastMinuteBpm).toBeNull()
    expect(detector.last.lastMinuteAt).toBeNull()

    const closed = detector.push(180000, 90)
    expect(closed.lastMinuteBpm).toBe(70)
    expect(closed.lastMinuteAt).toBe(120000)
    detector.push(181000, 92)
    expect(detector.last.lastMinuteBpm).toBe(70)
  })

  test('clears the measured minute when the next closed minute has too few samples', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)
    for (let seconds = 0; seconds < 60; seconds++) detector.push(seconds * 1000, 70)
    for (let seconds = 60; seconds < 117; seconds += 2) detector.push(seconds * 1000, 72)
    detector.push(120000, 72)

    expect(detector.last.lastMinuteBpm).toBeNull()
    expect(detector.last.lastMinuteAt).toBeNull()
  })

  test('counts only usable minutes in the lagged baseline window', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)
    const minuteBpm = [70, 71, 100, 72, 73, 74, 74, 74, 74, 74, 74]
    for (let seconds = 0; seconds <= 10 * 60; seconds++) {
      if (seconds >= 140 && seconds < 160) continue
      detector.push(seconds * 1000, minuteBpm[Math.floor(seconds / 60)] ?? 74)
    }

    expect(detector.last.hasBaseline).toBe(false)
    expect(detector.last.baselineMinutes).toBe(4)
    expect(detector.last.baseline).toBe(0)

    for (let seconds = 10 * 60 + 1; seconds <= 11 * 60; seconds++) detector.push(seconds * 1000, 74)
    expect(detector.last.hasBaseline).toBe(true)
    expect(detector.last.baselineMinutes).toBe(5)
    expect(detector.last.baseline).toBe(72)
  })

  test('does not report a minute rise from an unusable minute', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)
    for (let seconds = 0; seconds < 11 * 60 + 20; seconds++) {
      detector.push(seconds * 1000, seconds < 11 * 60 ? 70 : 90)
    }
    for (let seconds = 11 * 60 + 40; seconds <= 12 * 60; seconds++) {
      detector.push(seconds * 1000, 90)
    }

    expect(detector.last.hasBaseline).toBe(true)
    expect(detector.last.rise).toBe(0)
    expect(detector.last.lastMinuteBpm).toBeNull()
    expect(detector.last.lastMinuteAt).toBeNull()
  })

  test('reset clears measured feedback and usable baseline count', () => {
    const detector = new NudgeDetector(defaultSettings())
    detector.startMonitoring(0, 0)
    for (let seconds = 0; seconds <= 11 * 60; seconds++) detector.push(seconds * 1000, 70)
    detector.reset()

    expect(detector.last.lastMinuteBpm).toBeNull()
    expect(detector.last.lastMinuteAt).toBeNull()
    expect(detector.last.baselineMinutes).toBe(0)
    expect(detector.last.hasBaseline).toBe(false)
  })
})
