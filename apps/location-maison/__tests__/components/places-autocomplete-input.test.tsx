import { act, fireEvent, render, screen } from '@testing-library/react'
import PlacesAutocompleteInput from '@/components/location/PlacesAutocompleteInput'

const fetchSuggestions = jest.fn()
const resolvePlace = jest.fn()

jest.mock('@/hooks/google-map/use-google-places', () => ({
  useGooglePlaces: () => ({ fetchSuggestions, resolvePlace }),
}))

describe('PlacesAutocompleteInput', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    fetchSuggestions.mockReset()
    resolvePlace.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const defaultProps = {
    inputId: 'district',
    kind: 'district' as const,
    value: '',
    isVerified: false,
    onSelect: jest.fn(),
    onClear: jest.fn(),
    onManualChange: jest.fn(),
  }

  it('ne considère jamais un texte libre comme une localisation validée', () => {
    render(<PlacesAutocompleteInput {...defaultProps} value="Toabet" />)

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sélectionnez un lieu proposé pour valider ce champ.',
    )
  })

  it('valide le nom affiché uniquement après résolution du placeId sélectionné', async () => {
    const onSelect = jest.fn()
    fetchSuggestions.mockResolvedValue({
      status: 'ok',
      items: [
        {
          placeId: 'google-atong-abe',
          mainText: 'Atong-Abè',
          secondaryText: 'Libreville, Estuaire, Gabon',
          label: 'Atong-Abè, Libreville, Estuaire, Gabon',
          source: 'GOOGLE_PLACES',
        },
      ],
    })
    resolvePlace.mockResolvedValue({
      placeId: 'google-atong-abe',
      name: 'Nom technique Google',
      lat: 0.401,
      lng: 9.47,
      city: 'Libreville',
      province: 'Estuaire',
      district: 'Atong-Abè',
      countryCode: 'GA',
    })

    render(<PlacesAutocompleteInput {...defaultProps} onSelect={onSelect} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Toabet' } })

    await act(async () => {
      jest.advanceTimersByTime(350)
      await Promise.resolve()
    })

    fireEvent.click(await screen.findByRole('option', { name: /Atong-Abè/i }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(fetchSuggestions).toHaveBeenCalledWith('Toabet', {
      bias: undefined,
      kind: 'district',
      province: undefined,
      city: undefined,
    })
    expect(resolvePlace).toHaveBeenCalledWith('google-atong-abe')
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ placeId: 'google-atong-abe', name: 'Atong-Abè' }),
    )
    expect(screen.getByRole('combobox')).toHaveValue('Atong-Abè')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('annule la validation dès que le nom sélectionné est retouché', async () => {
    const onClear = jest.fn()
    const onManualChange = jest.fn()
    fetchSuggestions.mockResolvedValue({ status: 'empty', items: [] })
    render(
      <PlacesAutocompleteInput
        {...defaultProps}
        value="Atong-Abè"
        isVerified
        onClear={onClear}
        onManualChange={onManualChange}
      />,
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Atong Abe modifié' } })

    await act(async () => {
      jest.advanceTimersByTime(350)
      await Promise.resolve()
    })

    expect(onClear).toHaveBeenCalled()
    expect(onManualChange).toHaveBeenCalledWith('Atong Abe modifié')
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
  })
})
