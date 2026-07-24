import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import SmartLocationPicker from '@/components/location/SmartLocationPicker'

const registerMock = jest.fn((name) => ({ name }))
const gpsMock = jest.fn()
const selectMock = jest.fn()
const setDistrictMock = jest.fn()
const editMock = jest.fn()
const confirmMock = jest.fn()
const cancelMock = jest.fn()

let formErrors: Record<string, any>
let handlerState: Record<string, any>
let photonState: Record<string, any>

jest.mock('react-hook-form', () => ({
  useFormContext: () => ({ register: registerMock, formState: { errors: formErrors } }),
}))
jest.mock('@/hooks/useLocationHandlers', () => ({ useLocationHandlers: () => handlerState }))
jest.mock('@/hooks/usePhotonSearch', () => ({ usePhotonSearch: () => photonState }))
jest.mock('next/dynamic', () => () => ({ coordinates, districtName }: any) => (
  <div data-testid="location-map">{JSON.stringify(coordinates)} {districtName}</div>
))
jest.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }))
jest.mock('@/components/ui/label', () => ({ Label: ({ children, ...props }: any) => <label {...props}>{children}</label> }))
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>, CardContent: ({ children }: any) => <div>{children}</div>,
}))
jest.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }))
jest.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }))

const place = (overrides: Record<string, any> = {}) => ({
  geometry: { coordinates: [9.45, 0.4] },
  properties: { name: 'Akebe', city: 'Libreville', suburb: '', state: 'Estuaire', ...overrides },
})

describe('SmartLocationPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    formErrors = {}
    handlerState = {
      handleLocationSelect: selectMock,
      handleGPSLocation: gpsMock,
      selectedLocation: null,
      districtQuery: '',
      setDistrictQuery: setDistrictMock,
      mapCoordinates: [0.4, 9.45],
      isEditingDistrict: false,
      handleEnableDistrictEdit: editMock,
      handleConfirmDistrictEdit: confirmMock,
      handleCancelDistrictEdit: cancelMock,
    }
    photonState = { results: [], isLoading: false }
  })

  it('lance le GPS et recherche un quartier dans les résultats Photon', () => {
    handlerState.districtQuery = 'Ak'
    photonState = { results: [place(), place({ name: 'Angondje', city: '', suburb: 'Akanda' })], isLoading: false }
    render(<SmartLocationPicker />)
    expect(screen.getByTestId('location-map')).toHaveTextContent('[0.4,9.45]')
    fireEvent.click(screen.getByRole('button', { name: /Utiliser ma position actuelle/i }))
    expect(gpsMock).toHaveBeenCalled()
    expect(screen.getByText('Akebe, Libreville, Estuaire')).toBeVisible()
    expect(screen.getByText('Angondje, Akanda, Estuaire')).toBeVisible()
    fireEvent.change(screen.getByPlaceholderText('Ex: Glass, Akanda, Lalala...'), { target: { value: 'Glass' } })
    expect(setDistrictMock).toHaveBeenCalledWith('Glass')
    fireEvent.click(screen.getByRole('button', { name: /Akebe, Libreville/i }))
    expect(selectMock).toHaveBeenCalledWith(photonState.results[0])
  })

  it('affiche le chargement et l erreur de validation du quartier', () => {
    handlerState.districtQuery = 'A'
    photonState = { results: [], isLoading: true }
    formErrors = { address: { district: { message: 'Le quartier est obligatoire' } } }
    const { container } = render(<SmartLocationPicker />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.getByText('Le quartier est obligatoire')).toBeVisible()
    expect(registerMock).toHaveBeenCalledWith('address.city')
    expect(registerMock).toHaveBeenCalledWith('address.province')
    expect(registerMock).toHaveBeenCalledWith('address.district')
  })

  it('présente la localisation sélectionnée et active sa personnalisation', () => {
    handlerState.selectedLocation = place()
    handlerState.districtQuery = 'Akebe-Poteau'
    render(<SmartLocationPicker />)
    expect(screen.getByText('Localisation détectée')).toBeVisible()
    expect(screen.getByText(/a été personnalisé/)).toBeVisible()
    expect(screen.getByTestId('location-map')).toHaveTextContent('Akebe')
    expect(screen.getAllByPlaceholderText("Sélectionnez d'abord un quartier").at(-1)).toHaveValue('Akebe-Poteau')
    fireEvent.click(screen.getByRole('button', { name: /Modifier/i }))
    expect(editMock).toHaveBeenCalled()
  })

  it('confirme ou annule l édition manuelle du quartier', () => {
    handlerState.selectedLocation = place()
    handlerState.districtQuery = 'Akebe'
    handlerState.isEditingDistrict = true
    render(<SmartLocationPicker />)
    expect(screen.getByText('Modification du nom du quartier')).toBeVisible()
    expect(screen.getByText('Édition')).toBeVisible()
    const input = screen.getByPlaceholderText('Tapez le nom du quartier...')
    expect(input).toBeEnabled()
    fireEvent.change(input, { target: { value: 'Akebe-Poteau' } })
    expect(setDistrictMock).toHaveBeenCalledWith('Akebe-Poteau')
    fireEvent.click(screen.getByRole('button', { name: /Confirmer/i }))
    fireEvent.click(screen.getByRole('button', { name: /Annuler/i }))
    expect(confirmMock).toHaveBeenCalled()
    expect(cancelMock).toHaveBeenCalled()
  })
})
