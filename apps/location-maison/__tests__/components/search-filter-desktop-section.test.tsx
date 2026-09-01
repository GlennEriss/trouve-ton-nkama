import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import FilterSearchDesktopPageSection from '@/components/search/FilterSearchDesktopPageSection'

const onSubmit = jest.fn()
const onClear = jest.fn()
const trackEvent = jest.fn()
let sessionStatus: string
let isImmobilierScope: boolean

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ toString: () => 'province=Estuaire' }),
}))
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: sessionStatus }) }))
jest.mock('@/hooks/useFormFilterSearchMediator', () => ({
  useFormFilterSearchMediator: () => ({ onSubmit, onClear }),
}))
jest.mock('@/hooks/useAlgoliaFacetOptions', () => ({
  useAlgoliaTypePropertyOptions: () => ({ options: [] }),
  useAlgoliaTagOptions: () => ({ options: [] }),
}))
jest.mock('@/hooks/useSearchCategoryScope', () => ({
  useIsImmobilierSearchScope: () => isImmobilierScope,
}))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: {
    CTA_SEARCH_WITH_IA_ENTRY_CLICK: 'ia-entry',
    CTA_SEARCH_SUBMIT_CLICK: 'search-submit',
  },
  useTrackEvent: () => ({ trackEvent }),
}))
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (callback: any) => (event: React.FormEvent) => {
      event.preventDefault()
      return callback({ province: 'Estuaire' })
    },
  }),
  FormProvider: ({ children }: any) => <>{children}</>,
}))
jest.mock('@hookform/resolvers/zod', () => ({ zodResolver: () => jest.fn() }))
jest.mock('@/models/schema', () => ({ FormFilterSchema: {} }))
jest.mock('@/constantes', () => ({ statusOptions: [] }))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))
jest.mock('@trouve-ton-nkama/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))
jest.mock('@/components/search/SelectProvince', () => ({ __esModule: true, default: () => <div data-testid="select-province" /> }))
jest.mock('@/components/search/SelectCity', () => ({ __esModule: true, default: () => <div data-testid="select-city" /> }))
jest.mock('@/components/search/SelectStreet', () => ({ __esModule: true, default: () => <div data-testid="select-street" /> }))
jest.mock('@/components/search/SelectCityModeScope', () => ({ __esModule: true, default: () => <div data-testid="select-city-mode-scope" /> }))
jest.mock('@/components/search/CategoryAttributeFilters', () => ({ __esModule: true, default: () => <div data-testid="category-attribute-filters" /> }))
jest.mock('@/components/shared/form/MultiSelectFormApp', () => ({
  __esModule: true,
  default: ({ name }: any) => <div data-testid={`multiselect-${name}`} />,
}))
jest.mock('@/components/shared/form/InputFormNumberApp', () => ({
  __esModule: true,
  default: ({ name, label }: any) => <label>{label}<input aria-label={label} name={name} /></label>,
}))
jest.mock('@/components/search/SearchWithAIAccessNoticeDialog', () => ({
  __esModule: true,
  default: ({ open }: any) => (open ? <div data-testid="ia-access-dialog" /> : null),
}))

describe('FilterSearchDesktopPageSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sessionStatus = 'unauthenticated'
    isImmobilierScope = true
  })

  it('affiche tous les blocs de filtres', () => {
    render(<FilterSearchDesktopPageSection />)
    expect(screen.getByTestId('select-province')).toBeInTheDocument()
    expect(screen.getByTestId('multiselect-status')).toBeInTheDocument()
    expect(screen.getByLabelText('Prix min')).toBeInTheDocument()
    expect(screen.getByLabelText('Surface max')).toBeInTheDocument()
    expect(screen.getByTestId('multiselect-typeProperty')).toBeInTheDocument()
    expect(screen.getByTestId('multiselect-tags')).toBeInTheDocument()
  })

  it('cache les filtres immobilier-only et reduit Secteur recherche a la Ville hors immobilier', () => {
    // Demande directe de l'utilisateur : les filtres de /search n'etaient adaptes qu'a
    // l'immobilier (Statut/Surface/Types d'annonces n'existent pas sur une annonce Mode, et
    // Province/Quartier sont soit codes en dur soit toujours vides a la creation d'une
    // annonce Mode, voir category-listing/create/page.tsx).
    isImmobilierScope = false
    render(<FilterSearchDesktopPageSection />)

    expect(screen.queryByTestId('select-province')).not.toBeInTheDocument()
    expect(screen.queryByTestId('select-street')).not.toBeInTheDocument()
    expect(screen.queryByTestId('multiselect-status')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Surface min')).not.toBeInTheDocument()
    expect(screen.queryByTestId('multiselect-typeProperty')).not.toBeInTheDocument()

    expect(screen.getByTestId('select-city-mode-scope')).toBeInTheDocument()
    // Generiques, restent visibles quelle que soit la categorie.
    expect(screen.getByLabelText('Prix min')).toBeInTheDocument()
    expect(screen.getByTestId('multiselect-tags')).toBeInTheDocument()
  })

  it('construit le lien de recherche IA avec les parametres actuels', () => {
    render(<FilterSearchDesktopPageSection />)
    expect(screen.getByText('Essayer la recherche IA')).toHaveAttribute(
      'href',
      expect.stringContaining('province=Estuaire'),
    )
  })

  it('bloque la recherche IA et ouvre la modale pour un visiteur non connecte', () => {
    render(<FilterSearchDesktopPageSection />)
    const link = screen.getByText('Essayer la recherche IA')
    const event = { preventDefault: jest.fn() }
    fireEvent.click(link, event)
    expect(trackEvent).toHaveBeenCalledWith('ia-entry', expect.objectContaining({ is_authenticated: 0 }))
    expect(screen.getByTestId('ia-access-dialog')).toBeInTheDocument()
  })

  it('laisse passer le clic recherche IA pour un utilisateur authentifie', () => {
    sessionStatus = 'authenticated'
    render(<FilterSearchDesktopPageSection />)
    fireEvent.click(screen.getByText('Essayer la recherche IA'))
    expect(trackEvent).toHaveBeenCalledWith('ia-entry', expect.objectContaining({ is_authenticated: 1 }))
    expect(screen.queryByTestId('ia-access-dialog')).not.toBeInTheDocument()
  })

  it('efface les filtres au clic sur Effacer', () => {
    render(<FilterSearchDesktopPageSection />)
    fireEvent.click(screen.getByText('Effacer'))
    expect(onClear).toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('search-submit', expect.objectContaining({ source: 'search_desktop_filters_clear' }))
  })

  it('soumet le formulaire et trace les filtres actifs', () => {
    render(<FilterSearchDesktopPageSection />)
    fireEvent.click(screen.getByText('Appliquer'))
    expect(onSubmit).toHaveBeenCalledWith({ province: 'Estuaire' })
    expect(trackEvent).toHaveBeenCalledWith(
      'search-submit',
      expect.objectContaining({ source: 'search_desktop_filters', has_filters: 1 }),
    )
  })
})
