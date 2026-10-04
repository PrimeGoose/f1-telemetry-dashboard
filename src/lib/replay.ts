import type { LapInfo, Sample, Session } from './types'

/** Index of the last sample with t <= time (clamped to the valid range). */
export function indexAt(samples: readonly Sample[], time: number): number {
  if (samples.length === 0) return -1
  if (time <= samples[0]!.t) return 0
  const last = samples.length - 1
  if (time >= samples[last]!.t) return last
  let lo = 0
  let hi = last
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (samples[mid]!.t <= time) lo = mid
    else hi = mid - 1
  }
  return lo
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f

/** Interpolated sample at session time `time` (gear and lap come from the earlier sample). */
export function sampleAt(session: Session, time: number): Sample {
  const { samples } = session
  const i = indexAt(samples, time)
  const a = samples[i]!
  const b = samples[Math.min(i + 1, samples.length - 1)]!
  if (a === b || b.t === a.t) return a
  const f = Math.min(1, Math.max(0, (time - a.t) / (b.t - a.t)))
  // Across a lap boundary distance wraps; keep the earlier lap's values until the next lap starts.
  if (b.lap !== a.lap) return f < 1 ? { ...a, t: time } : b
  return {
    t: time,
    lap: a.lap,
    distance: lerp(a.distance, b.distance, f),
    x: lerp(a.x, b.x, f),
    y: lerp(a.y, b.y, f),
    speed: lerp(a.speed, b.speed, f),
    throttle: lerp(a.throttle, b.throttle, f),
    brake: lerp(a.brake, b.brake, f),
    gear: a.gear,
    rpm: lerp(a.rpm, b.rpm, f),
  }
}

export function lapSamples(session: Session, lap: number): Sample[] {
  return session.samples.filter((s) => s.lap === lap)
}

/** Session time at which a lap starts (first sample of the lap). */
export function lapStartTime(session: Session, lap: number): number {
  return session.samples.find((s) => s.lap === lap)?.t ?? 0
}

export function sessionDuration(session: Session): number {
  return session.samples[session.samples.length - 1]?.t ?? 0
}

export function bestLap(laps: readonly LapInfo[]): LapInfo | undefined {
  return laps.reduce<LapInfo | undefined>((best, l) => (!best || l.timeS < best.timeS ? l : best), undefined)
}

/** Lap-local elapsed time at a given distance (linear interpolation within one lap). */
export function timeAtDistance(lap: readonly Sample[], distance: number): number {
  if (lap.length === 0) return 0
  const t0 = lap[0]!.t
  if (distance <= lap[0]!.distance) return 0
  for (let i = 1; i < lap.length; i++) {
    const a = lap[i - 1]!
    const b = lap[i]!
    if (distance <= b.distance) {
      const span = b.distance - a.distance
      const f = span <= 0 ? 0 : (distance - a.distance) / span
      return lerp(a.t, b.t, f) - t0
    }
  }
  return lap[lap.length - 1]!.t - t0
}

export interface DeltaPoint {
  distance: number
  /** seconds; positive = slower than the reference lap */
  delta: number
}

/** Running time delta of `lap` against `reference` over distance. */
export function deltaSeries(lap: readonly Sample[], reference: readonly Sample[]): DeltaPoint[] {
  const t0 = lap[0]?.t ?? 0
  return lap.map((s) => ({
    distance: s.distance,
    delta: s.t - t0 - timeAtDistance(reference, s.distance),
  }))
}
