import { buildSample } from '../../scripts/generate-sample'
import { parseSession } from '../lib/session'
import type { TelemetrySource } from '../lib/source'
import type { Session } from '../lib/types'

let cached: Session | undefined

/** The same synthetic session the app ships with, built in-memory (deterministic). */
export function testSession(): Session {
  cached ??= parseSession(buildSample())
  return cached
}

export function testSource(): TelemetrySource {
  return { load: async () => testSession() }
}
