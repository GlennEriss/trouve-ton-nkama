import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { FilterModalHomePage } from '@/components/home-page/FilterModalHomePage'

const setOpen = jest.fn()
const onApply = jest.fn()
const onSubmit = jest.fn()
const onClear = jest.fn()
let filterModalState: Record<string, unknown>

jest.mock('@/hooks/use-filter-modal', () => ({ useFilterModal: () => filterModalState }))
jest.mock('@/hooks/useFormFilterSearchMediator', () => ({
  useFormFilterSearchMediator: () => ({ onSubmit, onClear }),
}))
jest.mock('@/hooks/useAlgoliaFacetOptions', () => ({
  useAlgoliaTypePropertyOptions: () => ({ options: [{ value: 'Home', label: 'Maison' }] }),
  useAlgoliaTagOptions: () => ({ options: [{ value: 'piscine', label: 'Piscine' }] }),
}))
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (callback: any) => (event: React.FormEvent) => {
      event.preventDefault()
      return callback({})
    },
  }),
  FormProvider: ({ children }: any) => <>{children}</>,
}))
jest.mock('@hookform/resolvers/zod', () => ({ zodResolver: () => jest.fn() }))
jest.mock('@/models/schema', () => ({ FormFilterSchema: {} }))
jest.mock('@/constantes', () => ({ statusOptions: [{ value: 'FOR_RENT', label: 'À louer' }] }))
jest.mock('@radix-ui/react-dialog', () => ({ DialogDescription: ({ children }: any) => <p>{children}</p> }))
jest.mock('@trouve-ton-nkama/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => <div data-open={String(Boolean(open))}>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h1>{children}</h1>,
  DialogTrigger: ({ children }: any) => <>{children}</>,
}))
jest.mock('@trouve-ton-nkama/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))
jest.mock('@/components/search/SelectProvince', () => ({ __esModule: true, default: () => <div data-testid="select-province" /> }))
jest.mock('@/components/search/SelectCity', () => ({ __esModule: true, default: () => <div data-testid="select-city" /> }))
jest.mock('@/components/search/SelectStreet', () => ({ __esModule: true, default: () => <div data-testid="select-street" /> }))
jest.mock('@/components/shared/form/MultiSelectFormApp', () => ({
  __esModule: true,
  default: ({ name, options }: any) => (
    <div data-testid={`multiselect-${name}`}>{options.map((o: any) => o.label).join('|')}</div>
  ),
}))
jest.mock('@/components/shared/form/InputFormNumberApp', () => ({
  __esModule: true,
  default: ({ name, label }: any) => <label>{label}<input aria-label={label} name={name} /></label>,
}))

describe('FilterModalHomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    filterModalState = { open: true, setOpen, onApply }
  })

  it('affiche les champs de filtre principaux', () => {
    render(<FilterModalHomePage />)
    expect(screen.getByTestId('select-province')).toBeInTheDocument()
    expect(screen.getByTestId('select-city')).toBeInTheDocument()
    expect(screen.getByTestId('select-street')).toBeInTheDocument()
    expect(screen.getByTestId('multiselect-status')).toHaveTextContent('À louer')
    expect(screen.getByTestId('multiselect-typeProperty')).toHaveTextContent('Maison')
    expect(screen.getByTestId('multiselect-tags')).toHaveTextContent('Piscine')
    expect(screen.getByLabelText('Prix min')).toBeInTheDocument()
    expect(screen.getByLabelText('Surface max')).toBeInTheDocument()
  })

  it('ferme la modale via le chevron', () => {
    render(<FilterModalHomePage />)
    const svgs = document.querySelectorAll('[role="dialog"] svg')
    fireEvent.click(svgs[0])
    expect(setOpen).toHaveBeenCalledWith(false)
  })

  it('efface les filtres au clic sur Effacer', () => {
    render(<FilterModalHomePage />)
    fireEvent.click(screen.getByText('Effacer'))
    expect(onClear).toHaveBeenCalled()
  })

  it('soumet le formulaire et declenche onApply', () => {
    render(<FilterModalHomePage />)
    fireEvent.click(screen.getByText('Appliquer'))
    expect(onApply).toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalled()
  })
})
