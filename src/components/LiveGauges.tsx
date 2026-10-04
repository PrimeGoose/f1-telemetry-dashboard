import type { Sample } from '../lib/types'

const REDLINE = 12000

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-28 w-5 overflow-hidden rounded bg-white/10" role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div className="absolute bottom-0 w-full" style={{ height: `${value}%`, background: color }} />
      </div>
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  )
}

export function LiveGauges({ sample }: { sample: Sample }) {
  const rpmPct = Math.min(100, (sample.rpm / REDLINE) * 100)
  return (
    <section className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4" aria-label="Live values">
      <div>
        <div className="flex items-end gap-3">
          <span data-testid="speed" className="tabular text-6xl font-semibold leading-none">
            {Math.round(sample.speed)}
          </span>
          <span className="pb-1 text-sm text-slate-400">km/h</span>
          <span className="ml-auto flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Gear</span>
            <span data-testid="gear" className="text-4xl font-bold text-amber-300">
              {sample.gear}
            </span>
          </span>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-slate-400">
            <span>RPM</span>
            <span className="tabular" data-testid="rpm">
              {Math.round(sample.rpm)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-white/10">
            <div
              className="h-full"
              style={{
                width: `${rpmPct}%`,
                background: rpmPct > 92 ? '#ef4444' : rpmPct > 80 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <Bar label="Thr" value={sample.throttle} color="#22c55e" />
        <Bar label="Brk" value={sample.brake} color="#ef4444" />
      </div>
    </section>
  )
}
