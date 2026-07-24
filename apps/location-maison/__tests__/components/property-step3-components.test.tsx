import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import {
  AdditionalInformationComponent,
  ContactComponent,
  SelectCityComponent,
  SelectProvinceComponent,
  SelectStreetComponent,
} from '@/components/stepper/step3.components'

const watchMock = jest.fn()
const setAdditionalInformation = jest.fn()
let mockLocations: any
let mockLoading = false
let lastSelectProps: any

jest.mock('react-hook-form', () => ({
  useFormContext: () => ({ watch: watchMock }),
}))

jest.mock('@/hooks/use-location-sync', () => ({
  useLocationSync: () => ({ locations: mockLocations, isLoading: mockLoading }),
}))

jest.mock('@/hooks/useStep3FormPropertyMediator', () => ({
  useStep3FormPropertyMediator: () => ({
    getAdditionalInformation: () => 'calme',
    setAdditionalInformation,
  }),
}))

jest.mock('@/components/shared/form/SelectFormApp', () => ({
  SelectFormApp: (props: any) => {
    lastSelectProps = props
    return <div data-testid={`select-${props.name}`} data-disabled={String(Boolean(props.disabled))}>{props.options.map((option: any) => option.label).join('|')}</div>
  },
}))

jest.mock('@/components/shared/ui/TextareaApp', () => ({
  __esModule: true,
  default: ({ value, onChange }: any) => <textarea aria-label="informations" value={value} onChange={onChange} />,
}))

jest.mock('@/components/shared/form/PhoneNumberFormAppSimple', () => ({
  PhoneNumberParts: ({ value, onChange, placeholder }: any) => <input aria-label="contact" value={value} placeholder={placeholder} onChange={onChange} />,
}))

const values: Record<string, any> = {}

describe('composants de localisation de la troisième étape', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(values).forEach((key) => delete values[key])
    watchMock.mockImplementation((name: string) => values[name])
    mockLocations = {
      Estuaire: {
        Libreville: ['Akébé', 'Nzeng-Ayong'],
        Owendo: ['Akournam'],
      },
      Ogooué_Maritime: { Port_Gentil: ['Balise'] },
    }
    mockLoading = false
  })

  it('trie les provinces et signale une province saisie absente du catalogue', () => {
    values.province = 'Woleu-Ntem'
    render(<SelectProvinceComponent field={{ control: {}, value: 'Woleu-Ntem' }} />)
    expect(screen.getByTestId('select-province')).toHaveTextContent('Estuaire|Ogooué_Maritime|Woleu-Ntem')
    expect(screen.getByText('Nouvelle province')).toBeVisible()
    expect(lastSelectProps.disabled).toBe(false)
  })

  it('gère le chargement et un catalogue de provinces indisponible', () => {
    mockLocations = null
    mockLoading = true
    render(<SelectProvinceComponent field={{ control: {}, value: '' }} />)
    expect(screen.getByTestId('select-province')).toHaveTextContent('')
    expect(lastSelectProps.disabled).toBe(true)
  })

  it('liste les villes, conserve une nouvelle ville et guide sans province', () => {
    values.province = 'Estuaire'
    values.city = 'Cocobeach'
    const { rerender } = render(<SelectCityComponent field={{ control: {}, value: 'Cocobeach' }} />)
    expect(screen.getByTestId('select-city')).toHaveTextContent('Cocobeach|Libreville|Owendo')
    expect(screen.getByText('Nouvelle ville')).toBeVisible()

    values.province = undefined
    values.city = undefined
    rerender(<SelectCityComponent field={{ control: {}, value: '' }} />)
    expect(screen.getByText('Sélectionnez une province pour voir les villes disponibles')).toBeVisible()
    expect(lastSelectProps.disabled).toBe(true)
  })

  it('liste et compte les quartiers d’une ville connue', () => {
    values.province = 'Estuaire'
    values.city = 'Libreville'
    values.street = 'Glass'
    render(<SelectStreetComponent field={{ control: {}, value: 'Glass' }} />)
    expect(screen.getByTestId('select-street')).toHaveTextContent('Akébé|Glass|Nzeng-Ayong')
    expect(screen.getByText('Nouveau quartier')).toBeVisible()
    expect(screen.getByText('2 quartiers disponibles dans Libreville')).toBeVisible()
  })

  it('explique une ville sans quartier et l’absence de sélection', () => {
    values.province = 'Estuaire'
    values.city = 'Nouvelle ville'
    const { rerender } = render(<SelectStreetComponent field={{ control: {}, value: '' }} />)
    expect(screen.getByText(/Aucun quartier enregistré/)).toBeVisible()

    values.province = undefined
    values.city = undefined
    rerender(<SelectStreetComponent field={{ control: {}, value: '' }} />)
    expect(screen.getByText('Sélectionnez une province et une ville pour voir les quartiers')).toBeVisible()
    expect(lastSelectProps.disabled).toBe(true)
  })

  it('transmet les informations complémentaires et le téléphone', () => {
    const phoneChange = jest.fn()
    const { rerender } = render(<AdditionalInformationComponent />)
    fireEvent.change(screen.getByLabelText('informations'), { target: { value: 'proche école' } })
    expect(setAdditionalInformation).toHaveBeenCalledWith('proche école')

    rerender(<ContactComponent field={{ value: '+24166545430', onChange: phoneChange }} />)
    fireEvent.change(screen.getByLabelText('contact'), { target: { value: '+24177123456' } })
    expect(phoneChange).toHaveBeenCalled()

    rerender(<ContactComponent />)
    expect(screen.getByLabelText('contact')).toHaveValue('')
  })
})
