import { SAMPLE_FIELDS, SESSION_FORMAT, type LapInfo, type Sample, type Session } from './types'

export class SessionError extends Error {
  constructor(message: string) {
    super(`Invalid telemetry session: ${message}`)
    this.name = 'SessionError'
  }
}

type Json = Record<string, unknown>

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown, what: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new SessionError(`${what} must be a finite number`)
  return v
}

function str(v: unknown, what: string): string {
  if (typeof v !== 'string' || v.length === 0) throw new SessionError(`${what} must be a non-empty string`)
  return v
}

function range(v: number, lo: number, hi: number, what: string): number {
  if (v < lo || v > hi) throw new SessionError(`${what} out of range (${lo}..${hi}): ${v}`)
  return v
}

/** Validate and convert the compact JSON format into a typed Session. */
export function parseSession(raw: unknown): Session {
  if (!isObject(raw)) throw new SessionError('root must be an object')
  if (raw.format !== SESSION_FORMAT) throw new SessionError(`unsupported format "${String(raw.format)}"`)
  const label = str(raw.label, 'label')
  if (!/sample|synthetic/i.test(label)) throw new SessionError('label must state that the data is sample/synthetic')

  const fields = raw.fields
  if (!Array.isArray(fields) || fields.join(',') !== SAMPLE_FIELDS.join(',')) {
    throw new SessionError(`fields must be exactly ${SAMPLE_FIELDS.join(',')}`)
  }

  const circuit = raw.circuit
  if (!isObject(circuit)) throw new SessionError('circuit missing')
  const outlineRaw = circuit.outline
  if (!Array.isArray(outlineRaw) || outlineRaw.length < 8) throw new SessionError('circuit.outline needs >= 8 points')
  const outline = outlineRaw.map((p, i) => {
    if (!Array.isArray(p) || p.length !== 2) throw new SessionError(`outline[${i}] must be [x, y]`)
    return [num(p[0], `outline[${i}].x`), num(p[1], `outline[${i}].y`)] as [number, number]
  })

  const lapsRaw = raw.laps
  if (!Array.isArray(lapsRaw) || lapsRaw.length === 0) throw new SessionError('laps missing')
  const laps: LapInfo[] = lapsRaw.map((l, i) => {
    if (!isObject(l)) throw new SessionError(`laps[${i}] must be an object`)
    const sectors = l.sectorsS
    if (!Array.isArray(sectors) || sectors.length !== 3) throw new SessionError(`laps[${i}].sectorsS needs 3 values`)
    const s = sectors.map((v, k) => num(v, `laps[${i}].sectorsS[${k}]`)) as [number, number, number]
    const timeS = num(l.timeS, `laps[${i}].timeS`)
    if (Math.abs(s[0] + s[1] + s[2] - timeS) > 0.01) throw new SessionError(`laps[${i}] sectors do not add up to the lap time`)
    return { lap: num(l.lap, `laps[${i}].lap`), timeS, sectorsS: s }
  })

  const rows = raw.rows
  if (!Array.isArray(rows) || rows.length < 2) throw new SessionError('rows needs >= 2 samples')
  const samples: Sample[] = []
  let prevT = -Infinity
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!Array.isArray(r) || r.length !== SAMPLE_FIELDS.length) {
      throw new SessionError(`rows[${i}] must have ${SAMPLE_FIELDS.length} values`)
    }
    const s: Sample = {
      t: num(r[0], `rows[${i}].t`),
      lap: num(r[1], `rows[${i}].lap`),
      distance: range(num(r[2], `rows[${i}].distance`), 0, 100_000, `rows[${i}].distance`),
      x: num(r[3], `rows[${i}].x`),
      y: num(r[4], `rows[${i}].y`),
      speed: range(num(r[5], `rows[${i}].speed`), 0, 450, `rows[${i}].speed`),
      throttle: range(num(r[6], `rows[${i}].throttle`), 0, 100, `rows[${i}].throttle`),
      brake: range(num(r[7], `rows[${i}].brake`), 0, 100, `rows[${i}].brake`),
      gear: range(num(r[8], `rows[${i}].gear`), 1, 8, `rows[${i}].gear`),
      rpm: range(num(r[9], `rows[${i}].rpm`), 0, 20_000, `rows[${i}].rpm`),
    }
    if (s.t <= prevT) throw new SessionError(`rows[${i}].t must be strictly increasing`)
    if (!laps.some((l) => l.lap === s.lap)) throw new SessionError(`rows[${i}] references unknown lap ${s.lap}`)
    prevT = s.t
    samples.push(s)
  }

  return {
    label,
    generator: str(raw.generator, 'generator'),
    seed: num(raw.seed, 'seed'),
    sampleRateHz: range(num(raw.sampleRateHz, 'sampleRateHz'), 1, 1000, 'sampleRateHz'),
    driver: str(raw.driver, 'driver'),
    circuit: { name: str(circuit.name, 'circuit.name'), lengthM: num(circuit.lengthM, 'circuit.lengthM'), outline },
    laps,
    samples,
  }
}
