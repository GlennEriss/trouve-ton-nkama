import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
  LocationEditModal,
  buildLocationDefaultValues,
  buildLocationPatch,
} from '@/components/preview-property/LocationEditModal'
import { Property } from '@/models/annonce'

const toastMock = jest.fn()

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

// LocationPicker a sa propre responsabilité (déjà branché sur le formulaire de création) — ce
// test ne retest pas son comportement interne, seulement le câblage du modal (defaultValues,
// bouton Annuler/Enregistrer, gestion d'erreur). On le remplace par un stub qui expose des
// boutons pour piloter directement les champs du formulaire ambiant via useFormContext.
jest.mock('@/components/location/LocationPicker', () => {
  const { useFormContext } = require('react-hook-form')
  return {
    __esModule: true,
    default: function LocationPickerStub() {
      const { setValue, watch } = useFormContext()
      return (
        <div>
          <span data-testid="district-value">{watch('address.district')}</span>
          <button
            type="button"
            onClick={() => {
              setValue('address.district', 'PK13', { shouldValidate: true })
              setValue('address.city', 'Libreville', { shouldValidate: true })
              setValue('address.province', 'Estuaire', { shouldValidate: true })
              setValue('cityPlaceId', 'catalog:libreville', { shouldValidate: true })
              setValue('districtPlaceId', 'catalog:pk13', { shouldValidate: true })
              setValue('locationSource', 'OFFICIAL_CATALOG', { shouldValidate: true })
              setValue('longitude', 9.45, { shouldValidate: true })
              setValue('latitude', 0.39, { shouldValidate: true })
            }}
          >
            Choisir PK13, Libreville, Estuaire
          </button>
        </div>
      )
    },
  }
})

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'listing-1',
    street: 'Ancien quartier',
    city: 'Ancienne ville',
    province: 'Ancienne province',
    cityPlaceId: 'catalog:old-city',
    districtPlaceId: 'catalog:old-district',
    locationSource: 'OFFICIAL_CATALOG',
    longitude: 9.1,
    latitude: 0.1,
    country: 'Gabon',
    countryCode: 'GA',
    ...overrides,
  } as Property
}

describe('buildLocationDefaultValues / buildLocationPatch', () => {
  it("initialise le formulaire depuis les champs plats de l'annonce", () => {
    const property = makeProperty()
    const defaults = buildLocationDefaultValues(property)

    expect(defaults.address).toEqual({
      district: 'Ancien quartier',
      city: 'Ancienne ville',
      province: 'Ancienne province',
    })
    expect(defaults.cityPlaceId).toBe('catalog:old-city')
    expect(defaults.longitude).toBe(9.1)
    expect(defaults.latitude).toBe(0.1)
    // Repli sur l'unique coordonnée stockée, faute de décomposition street/city/province.
    expect(defaults.streetLon).toBe(9.1)
    expect(defaults.streetLat).toBe(0.1)
  })

  it('reconstruit le patch plat attendu par updateProperty à partir des valeurs du formulaire', () => {
    const patch = buildLocationPatch({
      address: { district: 'PK13', city: 'Libreville', province: 'Estuaire' },
      cityPlaceId: 'catalog:libreville',
      districtPlaceId: 'catalog:pk13',
      locationSource: 'OFFICIAL_CATALOG',
      longitude: 9.45,
      latitude: 0.39,
      country: 'Gabon',
      countryCode: 'GA',
    })

    expect(patch).toEqual({
      street: 'PK13',
      city: 'Libreville',
      province: 'Estuaire',
      cityPlaceId: 'catalog:libreville',
      districtPlaceId: 'catalog:pk13',
      locationSource: 'OFFICIAL_CATALOG',
      longitude: 9.45,
      latitude: 0.39,
      country: 'Gabon',
      countryCode: 'GA',
    })
  })
})

describe('LocationEditModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('affiche les valeurs actuelles de la localisation à l\'ouverture', () => {
    render(
      <LocationEditModal property={makeProperty()} isOpen onClose={jest.fn()} onSave={jest.fn()} />,
    )
    expect(screen.getByTestId('district-value')).toHaveTextContent('Ancien quartier')
  })

  it("Annuler ferme le modal sans appeler onSave", () => {
    const onSave = jest.fn()
    const onClose = jest.fn()
    render(<LocationEditModal property={makeProperty()} isOpen onClose={onClose} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Enregistrer construit le patch plat et le transmet à onSave, puis ferme le modal', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined)
    const onClose = jest.fn()
    render(<LocationEditModal property={makeProperty()} isOpen onClose={onClose} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Choisir PK13, Libreville, Estuaire' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith({
      street: 'PK13',
      city: 'Libreville',
      province: 'Estuaire',
      cityPlaceId: 'catalog:libreville',
      districtPlaceId: 'catalog:pk13',
      locationSource: 'OFFICIAL_CATALOG',
      longitude: 9.45,
      latitude: 0.39,
      country: 'Gabon',
      countryCode: 'GA',
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('affiche un toast et garde le modal ouvert si onSave échoue', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Échec réseau'))
    const onClose = jest.fn()
    render(<LocationEditModal property={makeProperty()} isOpen onClose={onClose} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Choisir PK13, Libreville, Estuaire' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Modification de la localisation échouée',
          description: 'Échec réseau',
          variant: 'destructive',
        }),
      ),
    )
    expect(onClose).not.toHaveBeenCalled()
  })
})
