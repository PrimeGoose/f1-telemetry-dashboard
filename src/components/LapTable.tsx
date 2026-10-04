import { formatDelta, formatLapTime, formatSector } from '../lib/format'
import { bestLap } from '../lib/replay'
import type { LapInfo } from '../lib/types'

interface Props {
  laps: readonly LapInfo[]
  currentLap: number
  /** live time of the current lap in seconds */
  currentLapTime: number
  onSelect: (lap: number) => void
}

export function LapTable({ laps, currentLap, currentLapTime, onSelect }: Props) {
  const best = bestLap(laps)
  const bestSectors = [0, 1, 2].map((i) => Math.min(...laps.map((l) => l.sectorsS[i]!)))
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3" aria-label="Lap times">
      <h2 className="mb-2 text-xs font-medium text-slate-200">Lap times</h2>
      <table className="tabular w-full text-sm">
        <thead className="text-left text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-1">Lap</th>
            <th>S1</th>
            <th>S2</th>
            <th>S3</th>
            <th>Time</th>
            <th className="text-right">Δ best</th>
          </tr>
        </thead>
        <tbody>
          {laps.map((l) => {
            const isBest = best?.lap === l.lap
            const active = l.lap === currentLap
            return (
              <tr
                key={l.lap}
                data-testid={`lap-${l.lap}`}
                aria-current={active ? 'true' : undefined}
                className={`cursor-pointer border-t border-white/5 hover:bg-white/5 ${active ? 'bg-sky-500/10' : ''}`}
                onClick={() => onSelect(l.lap)}
              >
                <td className="py-1.5 font-medium">{l.lap}</td>
                {l.sectorsS.map((s, i) => (
                  <td key={i} className={s === bestSectors[i] ? 'text-fuchsia-400' : ''}>
                    {formatSector(s)}
                  </td>
                ))}
                <td className={isBest ? 'font-semibold text-fuchsia-400' : ''}>{formatLapTime(l.timeS)}</td>
                <td className="text-right text-slate-400">{best ? formatDelta(l.timeS - best.timeS) : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-400">
        Current lap: <span className="tabular text-slate-200">{formatLapTime(currentLapTime)}</span> · purple = best
      </p>
    </section>
  )
}
