import React from 'react'
import { render, screen } from '@testing-library/react'

import HomePageComponent from '@/components/home-page/HomePageComponent'

let windowWidth: number

jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: windowWidth, height: 800 }) }))
jest.mock('@/components/home-page/HomePageMobileComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-home">mobile</div>,
}))
jest.mock('@/components/home-page/HomePageDesktopComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="desktop-home">desktop</div>,
}))
jest.mock('@/components/pwa/ModalPWAInstall', () => ({
  __esModule: true,
  default: () => <div data-testid="pwa-modal" />,
}))

describe('HomePageComponent', () => {
  it('affiche la variante mobile en dessous de 768px', () => {
    windowWidth = 375
    render(<HomePageComponent />)
    expect(screen.getByTestId('mobile-home')).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-home')).not.toBeInTheDocument()
    expect(screen.getByTestId('pwa-modal')).toBeInTheDocument()
  })

  it('affiche la variante desktop a partir de 768px', () => {
    windowWidth = 1280
    render(<HomePageComponent />)
    expect(screen.getByTestId('desktop-home')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-home')).not.toBeInTheDocument()
  })
})
