import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import LocationFiltersDropdown from '@/components/search/LocationFiltersDropdown'

const handleSubmitInner = jest.fn()
const onSubmit = jest.fn()
const clearLocationFilters = jest.fn()

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))
jest.mock('@/components/search/SelectProvince', () => ({ __esModule: true, default: () => <div data-testid="select-province" /> }))
jest.mock('@/components/search/SelectCity', () => ({ __esModule: true, default: () => <div data-testid="select-city" /> }))
jest.mock('@/components/search/SelectStreet', () => ({ __esModule: true, default: () => <div data-testid="select-street" /> }))

describe('LocationFiltersDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const form = { handleSubmit: (cb: any) => { handleSubmitInner.mockImplementation(() => cb({})); return handleSubmitInner } }

  it('affiche les selects de localisation', () => {
    render(<LocationFiltersDropdown form={form} onSubmit={onSubmit} clearLocationFilters={clearLocationFilters} />)
    expect(screen.getByTestId('select-province')).toBeInTheDocument()
    expect(screen.getByTestId('select-city')).toBeInTheDocument()
    expect(screen.getByTestId('select-street')).toBeInTheDocument()
  })

  it('applique les filtres via handleSubmit au clic sur Appliquer', () => {
    render(<LocationFiltersDropdown form={form} onSubmit={onSubmit} clearLocationFilters={clearLocationFilters} />)
    fireEvent.click(screen.getByText('Appliquer'))
    expect(handleSubmitInner).toHaveBeenCalled()
  })

  it('efface les filtres au clic sur Effacer', () => {
    render(<LocationFiltersDropdown form={form} onSubmit={onSubmit} clearLocationFilters={clearLocationFilters} />)
    fireEvent.click(screen.getByText('Effacer'))
    expect(clearLocationFilters).toHaveBeenCalled()
  })
})
