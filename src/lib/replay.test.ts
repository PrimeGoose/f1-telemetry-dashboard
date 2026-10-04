import { testSession } from '../test/fixture'
import { formatDelta, formatLapTime, formatSector } from './format'
import { bestLap, deltaSeries, indexAt, lapSamples, lapStartTime, sampleAt, sessionDuration, timeAtDistance } from './replay'
import type { Sample } from './types'

const mk = (t: number, distance: number, speed: number, lap = 1, gear = 3): Sample => ({
  t, lap, distance, x: distance, y: 0, speed, throttle: 50, brake: 0, gear, rpm: 9000,
})

describe('indexAt', () => {
  const s = [mk(0, 0, 0), mk(1, 10, 10), mk(2, 20, 20)]
  it('clamps at both ends', () => {
    expect(indexAt(s, -5)).toBe(0)
    expect(indexAt(s, 99)).toBe(2)
  })
  it('finds the last sample at or before t', () => {
    expect(indexAt(s, 0.99)).toBe(0)
    expect(indexAt(s, 1)).toBe(1)
    expect(indexAt(s, 1.5)).toBe(1)
  })
  it('handles empty input', () => {
    expect(indexAt([], 1)).toBe(-1)
  })
})

describe('sampleAt', () => {
  it('interpolates continuous values and keeps the gear of the earlier sample', () => {
    const session = { ...testSession(), samples: [mk(0, 0, 100, 1, 3), mk(1, 10, 200, 1, 4)] }
    const m = sampleAt(session, 0.25)
    expect(m.speed).toBeCloseTo(125)
    expect(m.distance).toBeCloseTo(2.5)
    expect(m.gear).toBe(3)
  })
  it('does not interpolate across a lap boundary', () => {
    const session = { ...testSession(), samples: [mk(0, 5290, 300, 1), mk(0.1, 0, 298, 2)] }
    const m = sampleAt(session, 0.05)
    expect(m.lap).toBe(1)
    expect(m.distance).toBe(5290)
  })
})

describe('sample session helpers', () => {
  const session = testSession()
  it('lap start times are increasing and match lap durations', () => {
    const starts = session.laps.map((l) => lapStartTime(session, l.lap))
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]! - starts[i - 1]!).toBeCloseTo(session.laps[i - 1]!.timeS, 2)
    }
  })
  it('lap distance runs from ~0 to about the circuit length', () => {
    const lap = lapSamples(session, 2)
    expect(lap[0]!.distance).toBeLessThan(1)
    expect(lap[lap.length - 1]!.distance).toBeGreaterThan(session.circuit.lengthM - 150)
  })
  it('duration is the sum of the lap times (within one sample)', () => {
    const total = session.laps.reduce((a, l) => a + l.timeS, 0)
    expect(Math.abs(sessionDuration(session) - total)).toBeLessThan(0.2)
  })
  it('finds the best lap', () => {
    expect(bestLap(session.laps)?.lap).toBe(3)
    expect(bestLap([])).toBeUndefined()
  })
})

describe('timeAtDistance / deltaSeries', () => {
  const fast = [mk(10, 0, 0), mk(11, 100, 0), mk(12, 200, 0)]
  const slow = [mk(20, 0, 0), mk(21.5, 100, 0), mk(23, 200, 0)]
  it('interpolates lap-local time', () => {
    expect(timeAtDistance(fast, 50)).toBeCloseTo(0.5)
    expect(timeAtDistance(fast, 999)).toBeCloseTo(2)
    expect(timeAtDistance(fast, -1)).toBe(0)
  })
  it('reports a positive delta when slower than the reference', () => {
    const d = deltaSeries(slow, fast)
    expect(d[0]!.delta).toBeCloseTo(0)
    expect(d[2]!.delta).toBeCloseTo(1)
  })
  it('the reference lap has zero delta against itself', () => {
    const lap = lapSamples(testSession(), 3)
    expect(Math.max(...deltaSeries(lap, lap).map((p) => Math.abs(p.delta)))).toBeCloseTo(0)
  })
})

describe('formatting', () => {
  it('formats lap times', () => {
    expect(formatLapTime(85.347)).toBe('1:25.347')
    expect(formatLapTime(59.9996)).toBe('1:00.000')
    expect(formatLapTime(-1)).toContain('–')
  })
  it('formats sectors and deltas', () => {
    expect(formatSector(26.5)).toBe('26.500')
    expect(formatDelta(0.1234)).toBe('+0.123')
    expect(formatDelta(-0.5)).toBe('−0.500')
    expect(formatDelta(0)).toBe('0.000')
  })
})
