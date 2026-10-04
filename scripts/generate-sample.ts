/**
 * Generates a fully SYNTHETIC telemetry replay (no real driver, car, circuit or game data).
 *
 *   npm run generate:sample      -> writes public/sample/session.json
 *
 * Model: a made-up closed circuit; a corner-speed limit from curvature; forward/backward
 * passes for acceleration and braking limits; then resampling at a fixed rate.
 * Deterministic for a given seed.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { SAMPLE_FIELDS, SESSION_FORMAT } from '../src/lib/types'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d

const N = 1600 // track points
const LENGTH_M = 5300
const SAMPLE_RATE_HZ = 10
const LAP_FACTORS = [0.972, 0.99, 1.0, 0.985] // corner-speed scale per lap (4 laps)
const GEAR_UP_KMH = [0, 62, 108, 148, 188, 228, 268, 305] // lower speed bound per gear 1..8

interface Track {
  x: number[]
  y: number[]
  ds: number
  curvature: number[]
}

function buildTrack(): Track {
  const raw: [number, number][] = []
  for (let i = 0; i < N; i++) {
    const p = (i / N) * Math.PI * 2
    const x = Math.cos(p) + 0.3 * Math.cos(3 * p + 0.6) + 0.08 * Math.sin(5 * p)
    const y = 0.62 * Math.sin(p) + 0.22 * Math.sin(2 * p + 1.1) + 0.12 * Math.cos(4 * p)
    raw.push([x, y])
  }
  let len = 0
  for (let i = 0; i < N; i++) {
    const a = raw[i]!
    const b = raw[(i + 1) % N]!
    len += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  const k = LENGTH_M / len
  const xs = raw.map((p) => p[0] * k)
  const ys = raw.map((p) => p[1] * k)
  const ds = LENGTH_M / N
  // heading change per metre, smoothed over +-6 points
  const heading = xs.map((_, i) => Math.atan2(ys[(i + 1) % N]! - ys[i]!, xs[(i + 1) % N]! - xs[i]!))
  const raw_k = heading.map((h, i) => {
    let d = heading[(i + 1) % N]! - h
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    return Math.abs(d) / ds
  })
  const W = 6
  const curvature = raw_k.map((_, i) => {
    let s = 0
    for (let j = -W; j <= W; j++) s += raw_k[(i + j + N) % N]!
    return s / (2 * W + 1)
  })
  return { x: xs, y: ys, ds, curvature }
}

/** Speed profile (m/s) around the lap for a given corner-speed factor. */
function speedProfile(track: Track, factor: number): number[] {
  const A_LAT = 27 * factor * factor // m/s^2
  const A_BRAKE = 44
  const aAccel = (v: number) => Math.max(2.5, 13 * (1 - v / 112))
  const vmax = track.curvature.map((c) => clamp(Math.sqrt(A_LAT / Math.max(c, 1e-6)), 19, 92))
  const v = [...vmax]
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 2 * N - 1; i >= 0; i--) {
      const a = i % N
      const next = (i + 1) % N
      v[a] = Math.min(v[a]!, Math.sqrt(v[next]! ** 2 + 2 * A_BRAKE * track.ds))
    }
    for (let i = 0; i < 2 * N; i++) {
      const a = i % N
      const next = (i + 1) % N
      v[next] = Math.min(v[next]!, Math.sqrt(v[a]! ** 2 + 2 * aAccel(v[a]!) * track.ds), vmax[next]!)
    }
  }
  return v
}

export interface BuiltSample {
  format: string
  label: string
  generator: string
  seed: number
  sampleRateHz: number
  driver: string
  circuit: { name: string; lengthM: number; outline: [number, number][] }
  laps: { lap: number; timeS: number; sectorsS: [number, number, number] }[]
  fields: readonly string[]
  rows: number[][]
}

export function buildSample(seed = 20260504): BuiltSample {
  const rand = mulberry32(seed)
  const track = buildTrack()

  const minX = Math.min(...track.x)
  const maxX = Math.max(...track.x)
  const minY = Math.min(...track.y)
  const maxY = Math.max(...track.y)
  const scale = 900 / Math.max(maxX - minX, maxY - minY)
  const ox = (1000 - (maxX - minX) * scale) / 2
  const oy = (1000 - (maxY - minY) * scale) / 2
  const mapX = (i: number) => ox + (track.x[i]! - minX) * scale
  const mapY = (i: number) => oy + (maxY - track.y[i]!) * scale // flip so +y is up

  const rows: number[][] = []
  const laps: BuiltSample['laps'] = []
  let sessionStart = 0

  LAP_FACTORS.forEach((factor, lapIdx) => {
    const lapNo = lapIdx + 1
    const v = speedProfile(track, factor + (rand() - 0.5) * 0.004)
    // cumulative time at each track point
    const tAt: number[] = [0]
    for (let i = 0; i < N; i++) {
      const vi = v[i]!
      const vn = v[(i + 1) % N]!
      tAt.push(tAt[i]! + (2 * track.ds) / (vi + vn))
    }
    const lapTime = tAt[N]!
    const timeAtIdx = (d: number) => {
      const f = d / track.ds
      const i = Math.min(N - 1, Math.floor(f))
      return tAt[i]! + (tAt[i + 1]! - tAt[i]!) * (f - i)
    }
    const s1 = timeAtIdx(LENGTH_M / 3)
    const s2 = timeAtIdx((2 * LENGTH_M) / 3)
    laps.push({
      lap: lapNo,
      timeS: round(lapTime, 3),
      sectorsS: [round(s1, 3), round(s2 - s1, 3), round(lapTime - s2, 3)],
    })
    // fix rounding so sectors add up exactly to the (rounded) lap time
    const L = laps[laps.length - 1]!
    L.sectorsS[2] = round(L.timeS - L.sectorsS[0] - L.sectorsS[1], 3)

    let idx = 0
    for (let k = 0; k * (1 / SAMPLE_RATE_HZ) < lapTime; k++) {
      const tl = k / SAMPLE_RATE_HZ
      while (idx < N - 1 && tAt[idx + 1]! <= tl) idx++
      const frac = (tl - tAt[idx]!) / (tAt[idx + 1]! - tAt[idx]!)
      const i2 = (idx + 1) % N
      const vms = v[idx]! + (v[i2]! - v[idx]!) * frac
      const kmh = vms * 3.6
      const dist = (idx + frac) * track.ds
      const x = mapX(idx) + (mapX(i2) - mapX(idx)) * frac
      const y = mapY(idx) + (mapY(i2) - mapY(idx)) * frac
      // longitudinal acceleration from the profile
      const dt = tAt[idx + 1]! - tAt[idx]!
      const a = (v[i2]! - v[idx]!) / dt
      let throttle: number
      let brake: number
      if (a < -4) {
        brake = clamp((-a / 44) * 115 + (rand() - 0.5) * 6, 8, 100)
        throttle = 0
      } else if (a > 0.4) {
        throttle = clamp(52 + (a / Math.max(2.5, 13 * (1 - vms / 112))) * 60 + (rand() - 0.5) * 4, 0, 100)
        brake = 0
      } else {
        throttle = clamp(28 + (rand() - 0.5) * 10, 0, 100)
        brake = a < -1.5 ? clamp(10 + (rand() - 0.5) * 4, 0, 100) : 0
        if (brake > 0) throttle = 0
      }
      let gear = 1
      for (let g = 0; g < GEAR_UP_KMH.length; g++) if (kmh >= GEAR_UP_KMH[g]!) gear = g + 1
      const lo = GEAR_UP_KMH[gear - 1]!
      const hi = gear < 8 ? GEAR_UP_KMH[gear]! + 14 : 345
      const rpm = clamp(7600 + ((kmh - lo) / Math.max(1, hi - lo)) * 4300 + (rand() - 0.5) * 80, 4200, 12400)
      rows.push([
        round(sessionStart + tl, 3),
        lapNo,
        round(dist, 1),
        round(x, 1),
        round(y, 1),
        round(kmh, 1),
        round(throttle, 0),
        round(brake, 0),
        gear,
        round(rpm, 0),
      ])
    }
    sessionStart += lapTime
  })

  const outline: [number, number][] = []
  for (let i = 0; i < N; i += 8) outline.push([round(mapX(i), 1), round(mapY(i), 1)])

  return {
    format: SESSION_FORMAT,
    label: 'SAMPLE DATA – synthetic, generated by scripts/generate-sample.ts (not real telemetry)',
    generator: 'scripts/generate-sample.ts',
    seed,
    sampleRateHz: SAMPLE_RATE_HZ,
    driver: 'Driver A (fictional)',
    circuit: { name: 'Sample Circuit (fictional)', lengthM: LENGTH_M, outline },
    laps,
    fields: SAMPLE_FIELDS,
    rows,
  }
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/sample/session.json')
  mkdirSync(dirname(out), { recursive: true })
  const built = buildSample()
  writeFileSync(out, JSON.stringify(built))
  const best = Math.min(...built.laps.map((l) => l.timeS))
  console.log(`wrote ${out}: ${built.rows.length} samples, ${built.laps.length} laps, best ${best.toFixed(3)} s`)
}
