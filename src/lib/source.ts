import { parseSession } from './session'
import type { Session } from './types'

/**
 * Anything that can provide a telemetry session. The dashboard only depends on this
 * interface; today it is fed by a bundled replay file. A live source (e.g. a WebSocket
 * bridge fed by a UDP parser) would implement the same shape – see the README.
 */
export interface TelemetrySource {
  load(): Promise<Session>
}

export class ReplayFileSource implements TelemetrySource {
  constructor(
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  async load(): Promise<Session> {
    const res = await this.fetchImpl(this.url)
    if (!res.ok) throw new Error(`Could not load replay (${res.status})`)
    return parseSession(await res.json())
  }
}
