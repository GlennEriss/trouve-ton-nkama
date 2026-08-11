import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import SearchRequestsListClient from '@/components/search-requests/SearchRequestsListClient'

const getSearchRequests = jest.fn()
const getBoostedSearchRequests = jest.fn()

jest.mock('@/db/search-request.db', () => ({
  getSearchRequests: (...args: unknown[]) => getSearchRequests(...args),
  getBoostedSearchRequests: (...args: unknown[]) => getBoostedSearchRequests(...args),
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))
jest.mock('@/constantes/property-type', () => ({
  TypeProperty: { Home: 'Maison', Studio: 'Studio' },
  TypePropertyEnum: { Home: 'home', Studio: 'studio' },
}))
jest.mock('@/constantes/gabon-locations', () => ({
  GABON_PROVINCES: [
    { name: 'Estuaire', capital: 'Libreville' },
    { name: 'Ogooué-Maritime', capital: 'Port-Gentil' },
  ],
}))
jest.mock('@/components/search-requests/SearchRequestCard', () => ({
  __esModule: true,
  default: ({ item }: any) => <div data-testid="card">{item.id}</div>,
}))

const makeRequest = (id: string) => ({ id, city: 'Libreville' })

describe('SearchRequestsListClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getBoostedSearchRequests.mockResolvedValue([])
    getSearchRequests.mockResolvedValue({ searchRequests: [], lastDoc: null, limitPerPage: 24 })
  })

  it('affiche un etat de chargement puis le vide quand aucune demande ne correspond', async () => {
    render(<SearchRequestsListClient />)

    expect(screen.getByText('Chargement...')).toBeInTheDocument()
    expect(await screen.findByText(/Aucune demande de recherche pour ces critères/)).toBeInTheDocument()
  })

  it('rend les demandes standard sous le titre general', async () => {
    getSearchRequests.mockResolvedValue({
      searchRequests: [makeRequest('sr-1'), makeRequest('sr-2')],
      lastDoc: null,
      limitPerPage: 24,
    })

    render(<SearchRequestsListClient />)

    expect(await screen.findByText('Toutes les demandes')).toBeInTheDocument()
    expect(screen.getAllByTestId('card')).toHaveLength(2)
  })

  it('met les demandes boostees en avant dans leur propre section', async () => {
    getBoostedSearchRequests.mockResolvedValue([makeRequest('boost-1')])

    render(<SearchRequestsListClient />)

    expect(await screen.findByText('Recherches urgentes')).toBeInTheDocument()
    expect(screen.getByTestId('card')).toHaveTextContent('boost-1')
  })

  // Les deux requetes sont independantes : sans deduplication, une demande
  // boostee apparaitrait deux fois sur la page.
  it('ne repete pas une demande boostee dans le flux general', async () => {
    getBoostedSearchRequests.mockResolvedValue([makeRequest('sr-1')])
    getSearchRequests.mockResolvedValue({
      searchRequests: [makeRequest('sr-1'), makeRequest('sr-2')],
      lastDoc: null,
      limitPerPage: 24,
    })

    render(<SearchRequestsListClient />)

    await screen.findByText('Recherches urgentes')
    const ids = screen.getAllByTestId('card').map((el) => el.textContent)
    expect(ids).toEqual(['sr-1', 'sr-2'])
  })

  it('interroge la premiere page sans filtre au montage', async () => {
    render(<SearchRequestsListClient />)

    await waitFor(() => expect(getSearchRequests).toHaveBeenCalled())
    expect(getSearchRequests).toHaveBeenCalledWith({
      limitPerPage: 24,
      lastDoc: null,
      typeProperty: undefined,
      transactionType: undefined,
      city: undefined,
    })
  })

  it('relance la recherche avec le type de bien choisi', async () => {
    render(<SearchRequestsListClient />)
    await waitFor(() => expect(getSearchRequests).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByDisplayValue('Tous les types de bien'), { target: { value: 'Home' } })

    await waitFor(() =>
      expect(getSearchRequests).toHaveBeenLastCalledWith(expect.objectContaining({ typeProperty: 'Home' })),
    )
  })

  it('relance la recherche avec le type de transaction choisi', async () => {
    render(<SearchRequestsListClient />)
    await waitFor(() => expect(getSearchRequests).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByDisplayValue('Location ou vente'), { target: { value: 'FOR_SALE' } })

    await waitFor(() =>
      expect(getSearchRequests).toHaveBeenLastCalledWith(expect.objectContaining({ transactionType: 'FOR_SALE' })),
    )
  })

  it('relance la recherche avec la ville choisie', async () => {
    render(<SearchRequestsListClient />)
    await waitFor(() => expect(getSearchRequests).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByDisplayValue('Toutes les villes'), { target: { value: 'Port-Gentil' } })

    await waitFor(() =>
      expect(getSearchRequests).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Port-Gentil' })),
    )
  })

  it('propose de publier sa propre recherche', async () => {
    render(<SearchRequestsListClient />)
    expect(screen.getByRole('link', { name: /Publier ma recherche/ })).toBeInTheDocument()
  })
})
