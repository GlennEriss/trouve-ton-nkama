import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import MapViewerModal from '@/components/search/MapViewerModal'

jest.mock('next/dynamic', () => () => (props: any) => (
  <div data-testid="google-map-viewer" data-open={String(Boolean(props.open))}>
    {props.lat} / {props.lng}
    <button onClick={() => props.onOpenChange(false)}>Fermer la carte</button>
  </div>
))
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

describe('MapViewerModal', () => {
  it('ouvre la carte au clic sur le bouton', () => {
    render(<MapViewerModal />)
    expect(screen.getByTestId('google-map-viewer')).toHaveAttribute('data-open', 'false')
    fireEvent.click(screen.getByText('Voir sur la carte'))
    expect(screen.getByTestId('google-map-viewer')).toHaveAttribute('data-open', 'true')
  })

  it('transmet les coordonnees du centre par defaut', () => {
    render(<MapViewerModal />)
    expect(screen.getByTestId('google-map-viewer')).toHaveTextContent('0.3476 / 9.4523')
  })

  it('ferme la carte via onOpenChange', () => {
    render(<MapViewerModal />)
    fireEvent.click(screen.getByText('Voir sur la carte'))
    fireEvent.click(screen.getByText('Fermer la carte'))
    expect(screen.getByTestId('google-map-viewer')).toHaveAttribute('data-open', 'false')
  })
})
