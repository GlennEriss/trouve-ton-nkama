import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { FilterModal } from '@/components/home-page/FilterModal'

const setOpen = jest.fn()
const setLocalProvince = jest.fn()
const setLocalMinPrice = jest.fn()
const clearLocalFilters = jest.fn()
const onApply = jest.fn()
const toggleLocal = jest.fn()
let filterModalState: Record<string, unknown>

jest.mock('@/hooks/use-filter-modal', () => ({ useFilterModal: () => filterModalState }))
jest.mock('@/hooks/useDynamicTags', () => ({
  useDynamicTags: () => ({ tagOptions: [{ tagName: 'piscine' }, { tagName: 'balcon' }] }),
}))
jest.mock('@radix-ui/react-slider', () => ({
  Root: ({ children, id }: any) => <div data-testid={id}>{children}</div>,
  Track: ({ children }: any) => <div>{children}</div>,
  Range: () => <div />,
  Thumb: () => <div />,
}))
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h1>{children}</h1>,
  DialogTrigger: ({ children }: any) => <>{children}</>,
}))
jest.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }))
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    open: true,
    setOpen,
    localProvince: [''],
    setLocalProvince,
    localCity: [''],
    setLocalCity: jest.fn(),
    localStreet: [''],
    setLocalStreet: jest.fn(),
    localMinPrice: '',
    setLocalMinPrice,
    localMaxPrice: '',
    setLocalMaxPrice: jest.fn(),
    localMinArea: '',
    setLocalMinArea: jest.fn(),
    localMaxArea: '',
    setLocalMaxArea: jest.fn(),
    localMinRooms: '',
    setLocalMinRooms: jest.fn(),
    localMaxRooms: '',
    setLocalMaxRooms: jest.fn(),
    localTypes: [] as string[],
    setLocalTypes: jest.fn(),
    localTags: [] as string[],
    setLocalTags: jest.fn(),
    clearLocalFilters,
    onApply,
    toggleLocal,
    ...overrides,
  }
}

describe('FilterModal (legacy)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    filterModalState = baseState()
  })

  it('affiche les champs de localisation, prix, surface et chambres', () => {
    render(<FilterModal />)
    expect(screen.getByLabelText('Province')).toBeInTheDocument()
    expect(screen.getByLabelText('Ville')).toBeInTheDocument()
    expect(screen.getByLabelText('Quartier')).toBeInTheDocument()
    expect(screen.getByLabelText('Prix min')).toBeInTheDocument()
    expect(screen.getByLabelText('Prix max')).toBeInTheDocument()
    expect(screen.getByTestId('area-slider')).toBeInTheDocument()
    expect(screen.getByTestId('rooms-slider')).toBeInTheDocument()
  })

  it('affiche tous les types de bien et les tags dynamiques', () => {
    render(<FilterModal />)
    expect(screen.getByText('piscine')).toBeInTheDocument()
    expect(screen.getByText('balcon')).toBeInTheDocument()
  })

  it('met a jour la province saisie', () => {
    render(<FilterModal />)
    fireEvent.change(screen.getByLabelText('Province'), { target: { value: 'Estuaire' } })
    expect(setLocalProvince).toHaveBeenCalledWith(['Estuaire'])
  })

  it('ne descend jamais sous zero pour le prix minimum', () => {
    render(<FilterModal />)
    fireEvent.change(screen.getByLabelText('Prix min'), { target: { value: '-50' } })
    expect(setLocalMinPrice).toHaveBeenCalledWith('0')
  })

  it('bascule un type de bien selectionne', () => {
    render(<FilterModal />)
    fireEvent.click(screen.getByText('piscine'))
    expect(toggleLocal).toHaveBeenCalledWith([], 'piscine', expect.any(Function))
  })

  it('ferme la modale via le chevron', () => {
    render(<FilterModal />)
    fireEvent.click(document.querySelector('[role="dialog"] svg')!)
    expect(setOpen).toHaveBeenCalledWith(false)
  })

  it('efface les filtres et applique la recherche', () => {
    render(<FilterModal />)
    fireEvent.click(screen.getByText('Effacer'))
    expect(clearLocalFilters).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Appliquer'))
    expect(onApply).toHaveBeenCalled()
  })
})
