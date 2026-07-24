import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import PropertyByProvince from '@/components/home-page/PropertyByProvince'
import { HOME_PROVINCES } from '@/constantes/home-page'

const push = jest.fn()
let summaryState: { data: any; isLoading: boolean; isError: boolean }

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img alt={props.alt} /> }))
jest.mock('framer-motion', () => ({
  motion: { button: ({ children, ...props }: any) => <button {...props}>{children}</button> },
  useReducedMotion: () => true,
}))
jest.mock('@/hooks/use-server-property-count-summary', () => ({
  useServerPropertyCountSummary: () => summaryState,
}))

describe('PropertyByProvince', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('affiche un bouton par province, avec le compteur charge', () => {
    summaryState = { data: { byProvince: { [HOME_PROVINCES[0].name]: 12 } }, isLoading: false, isError: false }
    render(<PropertyByProvince />)
    expect(screen.getAllByRole('button')).toHaveLength(HOME_PROVINCES.length)
    expect(screen.getByText('12 Annonce(s)')).toBeInTheDocument()
  })

  it('affiche Aucune annonce quand le compteur est a zero', () => {
    summaryState = { data: { byProvince: { [HOME_PROVINCES[0].name]: 0 } }, isLoading: false, isError: false }
    render(<PropertyByProvince />)
    expect(screen.getByText('Aucune annonce')).toBeInTheDocument()
  })

  it('affiche Indisponible en cas d erreur', () => {
    summaryState = { data: undefined, isLoading: false, isError: true }
    render(<PropertyByProvince />)
    expect(screen.getAllByText('Indisponible').length).toBeGreaterThan(0)
  })

  it('navigue vers la recherche filtree par province au clic', () => {
    summaryState = { data: { byProvince: {} }, isLoading: false, isError: false }
    render(<PropertyByProvince />)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(push).toHaveBeenCalledWith(expect.stringContaining(`province=${encodeURIComponent(HOME_PROVINCES[0].name)}`))
  })
})
