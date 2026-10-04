import { buildSample } from '../../scripts/generate-sample'
import { parseSession, SessionError } from './session'

const valid = () => structuredClone(buildSample())

describe('parseSession', () => {
  it('accepts the generated sample', () => {
    const s = parseSession(valid())
    expect(s.laps).toHaveLength(4)
    expect(s.samples.length).toBeGreaterThan(1000)
    expect(s.label).toMatch(/SAMPLE/)
  })

  it('rejects an unknown format', () => {
    expect(() => parseSession({ ...valid(), format: 'other/1' })).toThrow(SessionError)
  })

  it('requires the label to say the data is sample/synthetic', () => {
    expect(() => parseSession({ ...valid(), label: 'Real data' })).toThrow(/sample/i)
  })

  it('rejects wrong column order', () => {
    const raw = valid()
    raw.fields = [...raw.fields].reverse()
    expect(() => parseSession(raw)).toThrow(/fields/)
  })

  it('rejects non-increasing timestamps', () => {
    const raw = valid()
    raw.rows[5]![0] = raw.rows[4]![0]!
    expect(() => parseSession(raw)).toThrow(/strictly increasing/)
  })

  it('rejects out-of-range values', () => {
    const raw = valid()
    raw.rows[3]![8] = 12 // gear
    expect(() => parseSession(raw)).toThrow(/gear/)
  })

  it('rejects sectors that do not add up', () => {
    const raw = valid()
    raw.laps[0]!.sectorsS[0] += 1
    expect(() => parseSession(raw)).toThrow(/add up/)
  })

  it('rejects non-object input', () => {
    expect(() => parseSession(null)).toThrow(SessionError)
    expect(() => parseSession([])).toThrow(SessionError)
  })
})
