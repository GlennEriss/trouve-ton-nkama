import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import SearchLocationForm from '@/components/stepper/SearchLocationForm'

const setValueMock = jest.fn()
const forceSyncMock = jest.fn()
const locationExistsMock = jest.fn()

let searchState: Record<string, any>
let suggestionState: Record<string, any>
let syncState: Record<string, any>

jest.mock('react-hook-form', () => ({
  useFormContext: () => ({ setValue: setValueMock, watch: jest.fn() }),
}))
jest.mock('@/hooks/use-location-search', () => ({
  useLocationSearch: () => searchState,
  useLocationSuggestions: () => suggestionState,
}))
jest.mock('@/hooks/use-location-sync', () => ({ useLocationSync: () => syncState }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn() }) }))
jest.mock('@trouve-ton-nkama/ui/input', () => ({ Input: React.forwardRef((props: any, ref: any) => <input ref={ref} {...props} />) }))
jest.mock('@trouve-ton-nkama/ui/card', () => ({
  Card: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  CardContent: ({ children }: any) => <div>{children}</div>,
}))
jest.mock('@trouve-ton-nkama/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }))

const result = (name: string, overrides: Record<string, unknown> = {}) => ({
  geometry: { type: 'Point', coordinates: [9.45, 0.4] },
  properties: {
    name,
    city: 'Libreville',
    state: 'Estuaire',
    country: 'Gabon',
    countrycode: 'ga',
    osm_key: 'place',
    osm_value: 'city',
    ...overrides,
  },
})

describe('SearchLocationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    searchState = { data: [], isLoading: false, error: null }
    suggestionState = { data: [] }
    syncState = { forceSync: forceSyncMock, locationExists: locationExistsMock, isSyncing: false }
    forceSyncMock.mockResolvedValue(undefined)
    locationExistsMock.mockReturnValue(false)
  })

  afterEach(() => jest.useRealTimers())

  it('affiche les suggestions courtes et lance la recherche choisie', () => {
    suggestionState = { data: [
      { text: 'Akebe', highlighted: '<strong>Ake</strong>be', type: 'popular' },
      { text: 'Akanda', highlighted: 'Akanda', type: 'autocomplete' },
    ] }
    render(<SearchLocationForm />)
    const input = screen.getByPlaceholderText('Rechercher une localité au Gabon...')
    fireEvent.change(input, { target: { value: 'A' } })
    expect(screen.getByText('2 suggestions disponibles')).toBeVisible()
    expect(screen.getByText('Populaire')).toBeVisible()
    expect(screen.getByText('Suggestion')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /Akanda/i }))
    expect(input).toHaveValue('Akanda')
    expect(screen.getByText('Recherche en cours...')).toBeVisible()
  })

  it('sélectionne une localité et remplit tous les champs du formulaire', async () => {
    searchState = { data: [result('Akebe-Poteau')], isLoading: false, error: null }
    render(<SearchLocationForm />)
    const input = screen.getByPlaceholderText('Rechercher une localité au Gabon...')
    fireEvent.change(input, { target: { value: 'Akebe' } })
    await act(async () => jest.advanceTimersByTime(300))
    expect(screen.getByText('1 résultat trouvé')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /Akebe-Poteau/i }))

    await waitFor(() => expect(forceSyncMock).toHaveBeenCalledWith('Estuaire', 'Libreville', 'Akebe-Poteau'))
    expect(setValueMock.mock.calls).toEqual(expect.arrayContaining([
      ['province', 'Estuaire'], ['city', 'Libreville'], ['street', 'Akebe-Poteau'],
      ['country', 'Gabon'], ['countryCode', 'ga'], ['latitude', 0.4], ['longitude', 9.45],
    ]))
    expect(screen.getByText('Localité sélectionnée : Akebe-Poteau')).toBeVisible()
    expect(screen.getByText('Nouvelle localité ajoutée aux suggestions')).toBeVisible()
  })

  it('ne resynchronise pas une localité existante et gère les variantes de lieu', async () => {
    locationExistsMock.mockReturnValue(true)
    searchState = { data: [
      result('Libreville', { city: 'Libreville', osm_value: 'town' }),
      result('Ntoum', { city: '', state: 'Estuaire', osm_value: 'village' }),
      result('PK12', { city: 'Libreville', osm_key: 'highway', osm_value: 'residential' }),
    ], isLoading: false, error: null }
    render(<SearchLocationForm />)
    fireEvent.change(screen.getByPlaceholderText('Rechercher une localité au Gabon...'), { target: { value: 'Li' } })
    expect(screen.getByText('3 résultats trouvés')).toBeVisible()
    expect(screen.getByText('town')).toBeVisible()
    expect(screen.getByText('village')).toBeVisible()
    expect(screen.getByText('residential')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /Ntoum/i }))
    await waitFor(() => expect(screen.getByText('Localité sélectionnée : Ntoum')).toBeVisible())
    expect(forceSyncMock).not.toHaveBeenCalled()
    expect(setValueMock).toHaveBeenCalledWith('city', 'Ntoum')
  })

  it('conserve la sélection même si la synchronisation distante échoue', async () => {
    forceSyncMock.mockRejectedValue(new Error('Firestore offline'))
    searchState = { data: [result('Glass')], isLoading: false, error: null }
    render(<SearchLocationForm />)
    fireEvent.change(screen.getByPlaceholderText('Rechercher une localité au Gabon...'), { target: { value: 'Gl' } })
    fireEvent.click(screen.getByRole('button', { name: /Glass/i }))
    expect(await screen.findByText('Localité sélectionnée : Glass')).toBeVisible()
    expect(forceSyncMock).toHaveBeenCalled()
  })

  it('affiche les états chargement, synchronisation, erreur et absence de résultat', () => {
    searchState = { data: [], isLoading: true, error: null }
    const { rerender } = render(<SearchLocationForm />)
    const input = screen.getByPlaceholderText('Rechercher une localité au Gabon...')
    fireEvent.change(input, { target: { value: 'Ak' } })
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()

    searchState = { data: [], isLoading: false, error: new Error('réseau') }
    rerender(<SearchLocationForm />)
    expect(screen.getByText(/Erreur lors de la recherche/)).toBeVisible()

    searchState = { data: [], isLoading: false, error: null }
    syncState = { ...syncState, isSyncing: true }
    rerender(<SearchLocationForm />)
    expect(screen.getByText('Synchronisation avec la base de données...')).toBeVisible()
    syncState = { ...syncState, isSyncing: false }
    rerender(<SearchLocationForm />)
    expect(screen.getByText('Aucune localité trouvée pour "Ak"')).toBeVisible()
  })

  it('efface la saisie, rouvre au focus et ferme au clic extérieur', () => {
    searchState = { data: [result('Akebe')], isLoading: false, error: null }
    const { container } = render(<SearchLocationForm />)
    const input = screen.getByPlaceholderText('Rechercher une localité au Gabon...')
    fireEvent.change(input, { target: { value: 'Ak' } })
    expect(screen.getByText('Localités trouvées')).toBeVisible()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Localités trouvées')).not.toBeInTheDocument()
    fireEvent.focus(input)
    expect(screen.getByText('Localités trouvées')).toBeVisible()
    fireEvent.click(container.querySelector('button.p-2.mr-2')!)
    expect(input).toHaveValue('')
    expect(screen.getByText('Tapez pour voir les suggestions ou rechercher une localité')).toBeVisible()
  })
})
