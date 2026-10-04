import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { ReplayFileSource } from './lib/source'
import { testSession, testSource } from './test/fixture'

describe('<App />', () => {
  it('shows the sample-data badge and renders the dashboard once loaded', async () => {
    render(<App source={testSource()} autoplay={false} />)
    expect(screen.getByText(/SAMPLE DATA/)).toBeInTheDocument()
    expect(await screen.findByLabelText('Lap times')).toBeInTheDocument()
    expect(screen.getByTestId('speed')).toBeInTheDocument()
    expect(screen.getByTestId('car-dot')).toBeInTheDocument()
  })

  it('highlights the best lap and lists all laps', async () => {
    render(<App source={testSource()} autoplay={false} />)
    const table = await screen.findByLabelText('Lap times')
    expect(within(table).getAllByRole('row')).toHaveLength(1 + testSession().laps.length)
    expect(within(table).getByTestId('lap-3')).toHaveTextContent('0.000') // best lap: delta 0
  })

  it('jumps to another lap via the table', async () => {
    const user = userEvent.setup()
    render(<App source={testSource()} autoplay={false} />)
    const table = await screen.findByLabelText('Lap times')
    await user.click(within(table).getByTestId('lap-3'))
    expect(within(table).getByTestId('lap-3')).toHaveAttribute('aria-current', 'true')
  })

  it('toggles play/pause', async () => {
    const user = userEvent.setup()
    render(<App source={testSource()} autoplay={false} />)
    const btn = await screen.findByRole('button', { name: 'Play' })
    await user.click(btn)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('shows an error when the replay cannot be loaded', async () => {
    const failing = new ReplayFileSource('/missing.json', (async () => new Response('nope', { status: 404 })) as typeof fetch)
    render(<App source={failing} autoplay={false} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/404/)
  })
})
