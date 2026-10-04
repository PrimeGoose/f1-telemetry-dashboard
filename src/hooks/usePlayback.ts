import { useCallback, useEffect, useRef, useState } from 'react'

export interface Playback {
  time: number
  playing: boolean
  rate: number
  toggle: () => void
  seek: (t: number) => void
  setRate: (r: number) => void
}

/** requestAnimationFrame-driven replay clock that loops at `duration`. */
export function usePlayback(duration: number, autoplay = true): Playback {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(autoplay)
  const [rate, setRate] = useState(1)
  const last = useRef<number | null>(null)

  useEffect(() => {
    if (!playing || duration <= 0) return
    let raf = 0
    const tick = (now: number) => {
      if (last.current !== null) {
        const dt = (now - last.current) / 1000
        setTime((t) => {
          const next = t + dt * rate
          return next >= duration ? next % duration : next
        })
      }
      last.current = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      last.current = null
    }
  }, [playing, rate, duration])

  const toggle = useCallback(() => setPlaying((p) => !p), [])
  const seek = useCallback((t: number) => setTime(Math.min(Math.max(0, t), duration)), [duration])
  return { time, playing, rate, toggle, seek, setRate }
}
