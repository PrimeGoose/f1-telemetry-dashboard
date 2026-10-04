import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildSample } from './generate-sample'

describe('generate-sample', () => {
  it('is deterministic for a seed', () => {
    expect(buildSample(7)).toEqual(buildSample(7))
    expect(buildSample(7).rows).not.toEqual(buildSample(8).rows)
  })

  it('produces plausible laps', () => {
    const s = buildSample()
    for (const l of s.laps) {
      expect(l.timeS).toBeGreaterThan(60)
      expect(l.timeS).toBeLessThan(120)
    }
    const speeds = s.rows.map((r) => r[5]!)
    expect(Math.max(...speeds)).toBeLessThan(360)
    expect(Math.min(...speeds)).toBeGreaterThan(40)
  })

  it('never applies full throttle and brake together', () => {
    const s = buildSample()
    expect(s.rows.some((r) => r[6]! > 5 && r[7]! > 5)).toBe(false)
  })

  it('is clearly labelled as synthetic', () => {
    expect(buildSample().label).toMatch(/SAMPLE DATA/)
  })

  it('the committed public/sample/session.json is up to date with the generator', () => {
    const file = JSON.parse(readFileSync(resolve(__dirname, '../public/sample/session.json'), 'utf8'))
    expect(file).toEqual(JSON.parse(JSON.stringify(buildSample())))
  })
})
