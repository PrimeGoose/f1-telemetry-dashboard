/** One telemetry sample (all units documented, SI-ish except speed in km/h). */
export interface Sample {
  /** seconds since session start */
  t: number
  /** 1-based lap number */
  lap: number
  /** metres since the start/finish line of the current lap */
  distance: number
  /** track-map coordinates, 0..1000 */
  x: number
  y: number
  /** km/h */
  speed: number
  /** 0..100 % */
  throttle: number
  /** 0..100 % */
  brake: number
  /** 1..8 */
  gear: number
  rpm: number
}

export interface LapInfo {
  lap: number
  /** lap time in seconds */
  timeS: number
  /** sector times in seconds (sum equals timeS) */
  sectorsS: [number, number, number]
}

export interface Session {
  label: string
  generator: string
  seed: number
  sampleRateHz: number
  driver: string
  circuit: {
    name: string
    lengthM: number
    /** closed outline in track-map coordinates */
    outline: [number, number][]
  }
  laps: LapInfo[]
  samples: Sample[]
}

/** Column order of the compact `rows` format in the sample JSON file. */
export const SAMPLE_FIELDS = [
  't',
  'lap',
  'distance',
  'x',
  'y',
  'speed',
  'throttle',
  'brake',
  'gear',
  'rpm',
] as const satisfies readonly (keyof Sample)[]

export const SESSION_FORMAT = 'telemetry-sample/1'
