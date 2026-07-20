import { act, fireEvent, render, screen } from '@testing-library/react'
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form'
import LocationPicker from '@/components/location/LocationPicker'

const fetchSuggestions = jest.fn()
const resolvePlace = jest.fn()
const reverseGeocode = jest.fn()

jest.mock('@/hooks/google-map/use-google-places', () => ({
  useGooglePlaces: () => ({ fetchSuggestions, resolvePlace, reverseGeocode }),
}))

let formApi: UseFormReturn<any>

function LocationPickerHarness() {
  const form = useForm({
    defaultValues: {
      address: { province: 'Estuaire', city: '', district: '' },
      cityPlaceId: '',
      districtPlaceId: '',
      locationSource: 'UNVERIFIED',
      country: 'Gabon',
      countryCode: 'GA',
      longitude: 0,
      latitude: 0,
      provinceLon: 9.4673,
      provinceLat: 0.4162,
      cityLon: 0,
      cityLat: 0,
      streetLon: 0,
      streetLat: 0,
      isLocExact: false,
    },
  })
  formApi = form
  return (
    <FormProvider {...form}>
      <LocationPicker />
    </FormProvider>
  )
}

describe('LocationPicker Google Places', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    fetchSuggestions.mockReset()
    resolvePlace.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('enregistre les noms Google et leurs placeId, puis invalide une retouche libre', async () => {
    fetchSuggestions.mockImplementation(async (_input, { kind }) => ({
      status: 'ok',
      items: kind === 'city'
        ? [{
            placeId: 'google-libreville',
            mainText: 'Libreville',
            secondaryText: 'Estuaire, Gabon',
            label: 'Libreville, Estuaire, Gabon',
            source: 'GOOGLE_PLACES',
          }]
        : [{
            placeId: 'catalog:district:node:1827771028',
            mainText: 'Atong-Abè',
            secondaryText: 'Libreville, Estuaire, Gabon',
            label: 'Atong-Abè, Libreville, Estuaire, Gabon',
            source: 'OFFICIAL_CATALOG',
            place: {
              placeId: 'catalog:district:node:1827771028',
              name: 'Atong-Abè',
              lat: 0.4117628,
              lng: 9.4511796,
              city: 'Libreville',
              province: 'Estuaire',
              district: 'Atong-Abè',
              countryCode: 'GA',
            },
          }],
    }))
    resolvePlace.mockImplementation(async (placeId) =>
      placeId === 'google-libreville'
        ? {
            placeId,
            name: 'Libreville',
            lat: 0.4162,
            lng: 9.4673,
            city: 'Libreville',
            province: 'Estuaire',
            district: '',
            countryCode: 'GA',
          }
        : {
            placeId,
            name: 'Atong-Abè',
            lat: 0.401,
            lng: 9.47,
            city: 'Libreville',
            province: 'Estuaire',
            district: 'Atong-Abè',
            countryCode: 'GA',
          },
    )

    render(<LocationPickerHarness />)

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/ville/i), { target: { value: 'Libre' } })
      await Promise.resolve()
    })
    await act(async () => {
      jest.advanceTimersByTime(350)
      await Promise.resolve()
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('option', { name: /Libreville/i }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(formApi.getValues()).toMatchObject({
      address: { province: 'Estuaire', city: 'Libreville', district: '' },
      cityPlaceId: 'google-libreville',
      districtPlaceId: '',
      locationSource: 'UNVERIFIED',
    })

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/quartier/i), { target: { value: 'Toabet' } })
      await Promise.resolve()
    })
    await act(async () => {
      jest.advanceTimersByTime(350)
      await Promise.resolve()
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('option', { name: /Atong-Abè/i }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(formApi.getValues()).toMatchObject({
      address: { province: 'Estuaire', city: 'Libreville', district: 'Atong-Abè' },
      cityPlaceId: 'google-libreville',
      districtPlaceId: 'catalog:district:node:1827771028',
      locationSource: 'OFFICIAL_CATALOG',
      longitude: 9.4511796,
      latitude: 0.4117628,
      country: 'Gabon',
      countryCode: 'GA',
    })

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/quartier/i), { target: { value: 'Toabet libre' } })
      await Promise.resolve()
    })

    expect(formApi.getValues()).toMatchObject({
      address: { district: 'Toabet libre' },
      districtPlaceId: '',
      locationSource: 'UNVERIFIED',
    })
  })
})
