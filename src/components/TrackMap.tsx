import type { Sample } from '../lib/types'

interface Props {
  outline: readonly (readonly [number, number])[]
  current: Sample
  /** samples of the current lap up to now, drawn as a trail */
  trail: readonly Sample[]
  name: string
}

export function TrackMap({ outline, current, trail, name }: Props) {
  const d = outline.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${1000 - y}`).join(' ') + ' Z'
  const trailPts = trail.map((s) => `${s.x},${1000 - s.y}`).join(' ')
  const start = outline[0]
  return (
    <figure className="rounded-lg border border-white/10 bg-white/[0.03] p-3" aria-label="Track position">
      <figcaption className="mb-1 flex justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-200">Track position</span>
        <span>{name}</span>
      </figcaption>
      <svg viewBox="0 0 1000 1000" className="mx-auto h-auto max-h-[380px] w-full" role="img" aria-label="Circuit map">
        <path d={d} fill="none" stroke="#2a3142" strokeWidth={34} strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#475069" strokeWidth={4} strokeDasharray="2 14" strokeLinejoin="round" />
        {trail.length > 1 ? (
          <polyline points={trailPts} fill="none" stroke="#38bdf8" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        ) : null}
        {start ? <rect x={start[0] - 5} y={1000 - start[1] - 26} width={10} height={52} fill="#f8fafc" opacity={0.9} /> : null}
        <circle data-testid="car-dot" cx={current.x} cy={1000 - current.y} r={22} fill="#ef4444" stroke="#fff" strokeWidth={5} />
      </svg>
    </figure>
  )
}
