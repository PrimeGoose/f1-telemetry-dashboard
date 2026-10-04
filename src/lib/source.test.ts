import { ReplayFileSource } from './source'
import { testSession } from '../test/fixture'
import { buildSample } from '../../scripts/generate-sample'

describe('ReplayFileSource', () => {
  it('loads and validates a replay', async () => {
    const fetchMock = (async () => new Response(JSON.stringify(buildSample()))) as typeof fetch
    const s = await new ReplayFileSource('/x.json', fetchMock).load()
    expect(s.laps.length).toBe(testSession().laps.length)
  })
  it('throws on HTTP errors', async () => {
    const fetchMock = (async () => new Response('', { status: 500 })) as typeof fetch
    await expect(new ReplayFileSource('/x.json', fetchMock).load()).rejects.toThrow(/500/)
  })
  it('throws on invalid content', async () => {
    const fetchMock = (async () => new Response('{"format":"x"}')) as typeof fetch
    await expect(new ReplayFileSource('/x.json', fetchMock).load()).rejects.toThrow(/format/)
  })
})
