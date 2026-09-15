import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { LocationEditModal } from '@/components/preview-property/LocationEditModal'
import { Property } from '@/models/annonce'

const toastMock = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

// Seul le réseau (Google Places / catalogue) est simulé — LocationPicker,
// PlacesAutocompleteInput et le Select Province rendus ici sont les vrais composants du
// formulaire de création, exactement comme dans __tests__/components/location-picker.test.tsx.
// Ce test vérifie le point le plus fragile de la fonctionnalité : que la sélection
// province/ville/quartier dans ce formulaire imbriqué produit bien, une fois "Enregistrer"
// cliqué, le patch plat attendu par updateProperty (street/city/province...).
const fetchSuggestions = jest.fn()
const resolvePlace = jest.fn()
const reverseGeocode = jest.fn()

jest.mock('@/hooks/google-map/use-google-places', () => ({
  useGooglePlaces: () => ({ fetchSuggestions, resolvePlace, reverseGeocode }),
}))

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'listing-1',
    street: 'PK12',
    city: 'Libreville',
    province: 'Estuaire',
    cityPlaceId: 'catalog:city:libreville',
    districtPlaceId: 'catalog:district:pk12',
    locationSource: 'OFFICIAL_CATALOG',
    longitude: 9.4,
    latitude: 0.38,
    country: 'Gabon',
    countryCode: 'GA',
    ...overrides,
  } as Property
}

describe('LocationEditModal — intégration avec le vrai LocationPicker', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    fetchSuggestions.mockReset()
    resolvePlace.mockReset()
    toastMock.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('sélectionner un nouveau quartier via le catalogue officiel et Enregistrer transmet le patch plat correct', async () => {
    fetchSuggestions.mockImplementation(async (_input: string, { kind }: { kind: 'city' | 'district' }) => ({
      status: 'ok',
      items:
        kind === 'district'
          ? [
              {
                placeId: 'catalog:district:pk13',
                mainText: 'PK13',
                secondaryText: 'Libreville, Estuaire, Gabon',
                label: 'PK13, Libreville, Estuaire, Gabon',
                source: 'OFFICIAL_CATALOG',
                place: {
                  placeId: 'catalog:district:pk13',
                  name: 'PK13',
                  lat: 0.39,
                  lng: 9.45,
                  city: 'Libreville',
                  province: 'Estuaire',
                  district: 'PK13',
                  countryCode: 'GA',
                },
              },
            ]
          : [],
    }))

    const onSave = jest.fn().mockResolvedValue(undefined)
    const onClose = jest.fn()

    render(
      <LocationEditModal property={makeProperty()} isOpen onClose={onClose} onSave={onSave} />,
    )

    // La ville reste "Libreville" (déjà correcte) — seul le quartier est corrigé, PK12 -> PK13
    // (cas réel signalé par le client sur une annonce mal localisée).
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/quartier/i), { target: { value: 'PK13' } })
      await Promise.resolve()
    })
    await act(async () => {
      jest.advanceTimersByTime(350)
      await Promise.resolve()
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('option', { name: /PK13/i }))
      await Promise.resolve()
      await Promise.resolve()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith({
      street: 'PK13',
      city: 'Libreville',
      province: 'Estuaire',
      cityPlaceId: 'catalog:city:libreville',
      districtPlaceId: 'catalog:district:pk13',
      locationSource: 'OFFICIAL_CATALOG',
      longitude: 9.45,
      latitude: 0.39,
      country: 'Gabon',
      countryCode: 'GA',
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
