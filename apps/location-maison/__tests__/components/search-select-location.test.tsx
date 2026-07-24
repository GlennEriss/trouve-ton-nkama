import React from 'react'
import { render, screen } from '@testing-library/react'

import SelectProvince from '@/components/search/SelectProvince'
import SelectCity from '@/components/search/SelectCity'
import SelectStreet from '@/components/search/SelectStreet'

let mediatorState: Record<string, any>

jest.mock('@/hooks/useSelectFilterLocationMediator', () => ({
  useSelectFilterLocationMediator: () => mediatorState,
}))
jest.mock('@/components/shared/form/SelectFormApp', () => ({
  SelectFormApp: (props: any) => (
    <div data-testid={`select-${props.name}`} data-disabled={String(Boolean(props.disabled))} data-placeholder={props.placeholder}>
      {props.options.map((option: any) => option.label ?? option.value).join('|')}
    </div>
  ),
}))

function makeMediator(overrides: Partial<Record<string, unknown>> = {}) {
  const mediator = {
    getForm: () => ({ control: 'form-control' }),
    getProvinceOptions: () => [{ value: 'Estuaire', label: 'Estuaire' }],
    getCityOptions: () => [{ value: 'Libreville', label: 'Libreville' }],
    getStreetOptions: () => [{ value: 'Nkembo', label: 'Nkembo' }],
    onProvinceChange: jest.fn(),
    onCityChange: jest.fn(),
    onStreetChange: jest.fn(),
  }
  return {
    mediator,
    provincesLoading: false,
    citiesLoading: false,
    streetsLoading: false,
    selectedProvince: '',
    selectedCity: '',
    ...overrides,
  }
}

describe('SelectProvince', () => {
  it('affiche les options de province', () => {
    mediatorState = makeMediator()
    render(<SelectProvince />)
    expect(screen.getByTestId('select-province')).toHaveTextContent('Estuaire')
    expect(screen.getByTestId('select-province')).toHaveAttribute('data-disabled', 'false')
  })

  it('desactive le select pendant le chargement', () => {
    mediatorState = makeMediator({ provincesLoading: true })
    render(<SelectProvince />)
    expect(screen.getByTestId('select-province')).toHaveAttribute('data-disabled', 'true')
    expect(screen.getByTestId('select-province')).toHaveAttribute('data-placeholder', 'Chargement des provinces...')
  })
})

describe('SelectCity', () => {
  it('reste desactive sans province selectionnee', () => {
    mediatorState = makeMediator({ selectedProvince: '' })
    render(<SelectCity />)
    expect(screen.getByTestId('select-city')).toHaveAttribute('data-disabled', 'true')
  })

  it('s active une fois une province selectionnee', () => {
    mediatorState = makeMediator({ selectedProvince: 'Estuaire' })
    render(<SelectCity />)
    expect(screen.getByTestId('select-city')).toHaveAttribute('data-disabled', 'false')
    expect(screen.getByTestId('select-city')).toHaveTextContent('Libreville')
  })
})

describe('SelectStreet', () => {
  it('reste desactive sans ville selectionnee', () => {
    mediatorState = makeMediator({ selectedCity: '' })
    render(<SelectStreet />)
    expect(screen.getByTestId('select-street')).toHaveAttribute('data-disabled', 'true')
  })

  it('s active une fois une ville selectionnee', () => {
    mediatorState = makeMediator({ selectedCity: 'Libreville' })
    render(<SelectStreet />)
    expect(screen.getByTestId('select-street')).toHaveAttribute('data-disabled', 'false')
    expect(screen.getByTestId('select-street')).toHaveTextContent('Nkembo')
  })
})
