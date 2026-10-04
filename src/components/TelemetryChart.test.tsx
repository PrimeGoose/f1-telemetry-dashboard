import { render, screen } from '@testing-library/react'
import { TelemetryChart } from './TelemetryChart'

describe('<TelemetryChart />', () => {
  const props = {
    title: 'Speed',
    unit: 'km/h',
    xDomain: [0, 100] as const,
    yDomain: [0, 200] as const,
    series: [{ label: 'Lap 1', color: '#fff', points: [[0, 0], [50, 100], [100, 200]] as [number, number][] }],
  }

  it('draws one polyline per series scaled to the viewbox', () => {
    render(<TelemetryChart {...props} />)
    const line = screen.getByTestId('line-Lap 1')
    const pts = line.getAttribute('points')!.split(' ')
    expect(pts).toHaveLength(3)
    expect(pts[0]).toMatch(/^38\.0,/) // left padding
  })

  it('draws the cursor only inside the x-domain', () => {
    const { rerender } = render(<TelemetryChart {...props} cursorX={50} />)
    expect(screen.getByTestId('cursor')).toBeInTheDocument()
    rerender(<TelemetryChart {...props} cursorX={500} />)
    expect(screen.queryByTestId('cursor')).not.toBeInTheDocument()
  })
})
