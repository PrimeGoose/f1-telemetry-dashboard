export interface ChartSeries {
  label: string
  color: string
  points: readonly (readonly [number, number])[]
  /** draw as a faint reference line */
  muted?: boolean
}

interface Props {
  title: string
  unit?: string
  series: readonly ChartSeries[]
  xDomain: readonly [number, number]
  yDomain: readonly [number, number]
  /** x position of the playback cursor */
  cursorX?: number
  height?: number
}

const W = 600
const PAD = { l: 38, r: 8, t: 6, b: 16 }

/** Small dependency-free SVG line chart. */
export function TelemetryChart({ title, unit, series, xDomain, yDomain, cursorX, height = 120 }: Props) {
  const [x0, x1] = xDomain
  const [y0, y1] = yDomain
  const sx = (x: number) => PAD.l + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r)
  const sy = (y: number) => height - PAD.b - ((y - y0) / (y1 - y0 || 1)) * (height - PAD.t - PAD.b)
  const ticks = [y0, (y0 + y1) / 2, y1]

  return (
    <figure className="rounded-lg border border-white/10 bg-white/[0.03] p-2" aria-label={title}>
      <figcaption className="mb-1 flex items-center justify-between px-1 text-xs text-slate-400">
        <span className="font-medium text-slate-200">
          {title}
          {unit ? <span className="ml-1 text-slate-500">({unit})</span> : null}
        </span>
        <span className="flex gap-3">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3" style={{ background: s.color, opacity: s.muted ? 0.5 : 1 }} />
              {s.label}
            </span>
          ))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" className="h-auto w-full" preserveAspectRatio="none">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="#ffffff" strokeOpacity={0.08} />
            <text x={PAD.l - 4} y={sy(t) + 3} textAnchor="end" fontSize={9} fill="#7c8599">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <polyline
            key={s.label}
            data-testid={`line-${s.label}`}
            fill="none"
            stroke={s.color}
            strokeOpacity={s.muted ? 0.45 : 1}
            strokeWidth={s.muted ? 1 : 1.6}
            strokeLinejoin="round"
            points={s.points.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')}
          />
        ))}
        {cursorX !== undefined && cursorX >= x0 && cursorX <= x1 ? (
          <line
            data-testid="cursor"
            x1={sx(cursorX)}
            x2={sx(cursorX)}
            y1={PAD.t}
            y2={height - PAD.b}
            stroke="#f8fafc"
            strokeOpacity={0.7}
            strokeDasharray="3 3"
          />
        ) : null}
        <text x={PAD.l} y={height - 3} fontSize={9} fill="#7c8599">
          {Math.round(x0)} m
        </text>
        <text x={W - PAD.r} y={height - 3} fontSize={9} fill="#7c8599" textAnchor="end">
          {Math.round(x1)} m
        </text>
      </svg>
    </figure>
  )
}
