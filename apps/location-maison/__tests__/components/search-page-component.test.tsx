import React from 'react'
import { render, screen } from '@testing-library/react'

import SearchPageComponent from '@/components/search/SearchPageComponent'

let windowWidth: number

jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: windowWidth, height: 800 }) }))
jest.mock('@/components/search/SearchMobilePage', () => ({
  __esModule: true,
  default: () => <div data-testid="search-mobile" />,
}))
jest.mock('@/components/search/SearchDesktopPage', () => ({
  __esModule: true,
  default: () => <div data-testid="search-desktop" />,
}))

describe('SearchPageComponent', () => {
  it('affiche la variante mobile a 768px et en dessous', () => {
    windowWidth = 768
    render(<SearchPageComponent />)
    expect(screen.getByTestId('search-mobile')).toBeInTheDocument()
    expect(screen.queryByTestId('search-desktop')).not.toBeInTheDocument()
  })

  it('affiche la variante desktop au-dessus de 768px', () => {
    windowWidth = 1024
    render(<SearchPageComponent />)
    expect(screen.getByTestId('search-desktop')).toBeInTheDocument()
    expect(screen.queryByTestId('search-mobile')).not.toBeInTheDocument()
  })
})
