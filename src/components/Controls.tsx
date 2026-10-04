import type { Playback } from '../hooks/usePlayback'

interface Props {
  playback: Playback
  duration: number
  laps: readonly number[]
  currentLap: number
  onLap: (lap: number) => void
}

const RATES = [0.5, 1, 2, 4]

export function Controls({ playback, duration, laps, currentLap, onLap }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3" role="group" aria-label="Replay controls">
      <button
        type="button"
        onClick={playback.toggle}
        className="w-20 rounded bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
      >
        {playback.playing ? 'Pause' : 'Play'}
      </button>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        Speed
        <select
          aria-label="Playback speed"
          value={playback.rate}
          onChange={(e) => playback.setRate(Number(e.target.value))}
          className="rounded bg-slate-800 px-2 py-1 text-slate-100"
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        Lap
        <select
          aria-label="Jump to lap"
          value={currentLap}
          onChange={(e) => onLap(Number(e.target.value))}
          className="rounded bg-slate-800 px-2 py-1 text-slate-100"
        >
          {laps.map((l) => (
            <option key={l} value={l}>
              Lap {l}
            </option>
          ))}
        </select>
      </label>
      <input
        type="range"
        aria-label="Session position"
        min={0}
        max={Math.floor(duration * 10)}
        value={Math.floor(playback.time * 10)}
        onChange={(e) => playback.seek(Number(e.target.value) / 10)}
        className="min-w-48 flex-1 accent-sky-400"
      />
      <span className="tabular w-24 text-right text-xs text-slate-400">
        {playback.time.toFixed(1)} / {duration.toFixed(1)} s
      </span>
    </div>
  )
}
