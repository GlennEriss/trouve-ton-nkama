import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import ListPropertySection, {
  CardPropertyCrud,
  PropertyInformations,
} from '@/components/property/ListPropertySection'
import type { Property } from '@/models/annonce'

const getPropertiesMock = jest.fn()
const getCountMock = jest.fn()
const updatePropertyMock = jest.fn()
const fetchNextPageMock = jest.fn()
const setQueryDataMock = jest.fn()
const logFallbackMock = jest.fn()
const logLoadMock = jest.fn()
const logErrorMock = jest.fn()
const loggerErrorMock = jest.fn()

let currentUser: Record<string, unknown> | null
let queryState: Record<string, any>
let queryOptions: Record<string, any>

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => 'home' }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, onLoad, onError, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} onLoad={onLoad} onError={onError} />
  ),
}))

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: currentUser }),
}))

jest.mock('@/db/property.db', () => ({
  getProperties: (...args: unknown[]) => getPropertiesMock(...args),
  getCountStatisticsByPropertyType: (...args: unknown[]) => getCountMock(...args),
  updateProperty: (...args: unknown[]) => updatePropertyMock(...args),
}))

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (options: Record<string, any>) => {
    queryOptions = options
    return queryState
  },
  useQueryClient: () => ({ setQueryData: setQueryDataMock }),
}))

jest.mock('@/components/property/RemoveProperty', () => ({
  RemoveProperty: ({ id }: { id: string }) => <button>Supprimer {id}</button>,
}))

jest.mock('@/components/promotion/PromotionButton', () => ({
  __esModule: true,
  default: ({ property }: { property: Property }) => <button>Promouvoir {property.id}</button>,
}))

jest.mock('@/components/promotion/PromotionBadge', () => ({
  __esModule: true,
  default: ({ property }: { property: Property }) => <span>Badge {property.id}</span>,
}))

jest.mock('@/lib/image-debug', () => ({
  logImageFallback: (...args: unknown[]) => logFallbackMock(...args),
  logImageLoad: (...args: unknown[]) => logLoadMock(...args),
  logImageError: (...args: unknown[]) => logErrorMock(...args),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: (...args: unknown[]) => loggerErrorMock(...args) }),
}))

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: 'property-9b',
    title: 'Maison familiale Akanda',
    description: 'Une annonce de test complète',
    typeProperty: 'Home',
    images: [{ filePATH: 'properties/home.jpg', fileURL: 'https://example.com/home.jpg', thumbURL: 'https://example.com/thumb.jpg' }],
    street: 'Angondjé',
    city: 'Akanda',
    province: 'Estuaire',
    longitude: 9.5,
    latitude: 0.4,
    country: 'Gabon',
    countryCode: 'GA',
    area: 180,
    price: 450000,
    tags: [],
    status: 'FOR_RENT',
    state: 'IN_PROGRESS',
    moderationStatus: 'APPROVED',
    nbrRooms: 4,
    nbrKitchens: 1,
    nbrBathrooms: 2,
    nbrToilets: 2,
    nbrFloors: 1,
    nbrGarages: 1,
    ...overrides,
  } as Property
}

function readyState(properties: Property[], pages?: Array<{ properties: Property[]; lastDoc: unknown }>) {
  return {
    data: { pages: pages ?? [{ properties, lastDoc: 'last-document' }] },
    isPending: false,
    isFetching: false,
    fetchNextPage: fetchNextPageMock,
    error: null,
    isError: false,
  }
}

describe('ListPropertySection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    currentUser = { uid: 'owner-9b', phoneNumberVerified: true }
    queryState = readyState([property()])
    getCountMock.mockResolvedValue(16)
    getPropertiesMock.mockResolvedValue({ properties: [property()], lastDoc: null })
    updatePropertyMock.mockResolvedValue(undefined)
  })

  it('charge les annonces du propriétaire et navigue entre les pages', async () => {
    queryState = readyState([], [
      { properties: [property({ id: 'first', title: 'Première maison' })], lastDoc: 'cursor-1' },
      { properties: [property({ id: 'second', title: 'Deuxième maison' })], lastDoc: null },
    ])
    render(<ListPropertySection />)

    expect(screen.getByText('Première maison')).toBeVisible()
    await waitFor(() => expect(screen.getByText(/Page/).parentElement).toHaveTextContent('sur 2'))
    expect(queryOptions.queryKey).toEqual(['properties', 'Home', currentUser])
    expect(queryOptions.initialPageParam).toEqual({ limitPerPage: expect.any(Number), lastDoc: null })

    await queryOptions.queryFn({ pageParam: { limitPerPage: 8, lastDoc: 'cursor' } })
    expect(getPropertiesMock).toHaveBeenCalledWith({
      limitPerPage: 8,
      lastDoc: 'cursor',
      createdBy: 'owner-9b',
      type: 'Home',
    })
    expect(queryOptions.getNextPageParam({}, [{ lastDoc: 'next-cursor' }], { limitPerPage: 8 })).toEqual({
      limitPerPage: 8,
      lastDoc: 'next-cursor',
    })
    expect(queryOptions.getNextPageParam({}, [{ lastDoc: null }], { limitPerPage: 8 })).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByText('Deuxième maison')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }))
    expect(screen.getByText('Première maison')).toBeVisible()
  })

  it('rend le chargement, le vide et journalise une erreur de requête', async () => {
    queryState = readyState([], undefined)
    const { rerender } = render(<ListPropertySection />)
    expect(screen.getByRole('heading', { name: 'Aucune annonce trouvée' })).toBeVisible()

    queryState = { ...readyState([]), isPending: true }
    rerender(<ListPropertySection />)
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(64)
    expect(screen.queryByRole('heading', { name: 'Aucune annonce trouvée' })).not.toBeInTheDocument()

    queryState = { ...readyState([]), isError: true, error: new Error('Firestore indisponible') }
    rerender(<ListPropertySection />)
    expect(loggerErrorMock).toHaveBeenCalledWith('Failed to fetch properties list', expect.objectContaining({
      type: 'Home',
      uid: 'owner-9b',
    }))
    await waitFor(() => expect(getCountMock).toHaveBeenCalledWith('owner-9b', 'Home'))
  })

  it('archive puis réactive une annonce et met à jour le cache paginé', async () => {
    render(<CardPropertyCrud property={property()} />)
    const availability = screen.getByRole('switch', { name: 'Marquer comme indisponible' })
    fireEvent.click(availability)

    await waitFor(() => expect(updatePropertyMock).toHaveBeenCalledWith('property-9b', expect.objectContaining({ state: 'ARCHIVED' })))
    expect(setQueryDataMock).toHaveBeenCalledWith(['properties', 'Home', currentUser], expect.any(Function))
    const updater = setQueryDataMock.mock.calls[0][1]
    expect(updater({ pages: [{ properties: [property(), property({ id: 'other' })] }] })).toEqual({
      pages: [{ properties: [expect.objectContaining({ id: 'property-9b', state: 'ARCHIVED' }), expect.objectContaining({ id: 'other', state: 'IN_PROGRESS' })] }],
    })
    expect(updater(undefined)).toBeUndefined()
    expect(await screen.findByText('Indisponible')).toBeVisible()

    fireEvent.click(screen.getByRole('switch', { name: 'Marquer comme disponible' }))
    await waitFor(() => expect(updatePropertyMock).toHaveBeenLastCalledWith('property-9b', expect.objectContaining({ state: 'IN_PROGRESS' })))
  })

  it('gère la vignette, le fallback et les événements de chargement', () => {
    const { rerender } = render(<CardPropertyCrud property={property()} />)
    const image = screen.getByAltText('Maison familiale Akanda')
    expect(image).toHaveAttribute('src', 'https://example.com/thumb.jpg')
    fireEvent.load(image)
    fireEvent.error(image)
    expect(logLoadMock).toHaveBeenCalled()
    expect(logErrorMock).toHaveBeenCalled()

    rerender(<CardPropertyCrud property={property({ id: 'without-image', images: [] })} />)
    expect(screen.getByAltText('Maison familiale Akanda')).toHaveAttribute('src', '/home.png')
    expect(logFallbackMock).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 'without-image' }))
  })

  it.each([
    ['Apartment', { nbrRooms: 2, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1 }, 'Chambres'],
    ['Building', { nbrFloors: 3, nbrApartments: 6, hasParking: true }, 'Appartements'],
    ['Desk', { nbrRooms: 4, nbrToilets: 2 }, 'Salles'],
    ['Home', { nbrRooms: 3, nbrKitchens: 1, nbrBathrooms: 2, nbrToilets: 2, nbrFloors: 1, nbrGarages: 1 }, 'Garages'],
    ['Studio', { nbrRooms: 1, nbrChickens: 1, nbrBathrooms: 1, nbrToilets: 1 }, 'Cuisines'],
    ['Shop', { nbrRooms: 2, nbrToilet: 1 }, 'Toilettes'],
    ['Kiosk', { kioskType: 'Métallique' }, 'Type de Kiosque: Métallique'],
    ['Room', { roomType: 'Meublée' }, 'Type de chambre: Meublée'],
    ['Villa', { nbrRooms: 5, nbrKitchens: 2, nbrBathrooms: 3, nbrToilets: 3, nbrFloors: 2, nbrPiscine: 1, nbrGarages: 2 }, 'Piscines'],
    ['Land', { area: 950 }, 'Superficie: 950 m²'],
  ] as const)('affiche les informations spécifiques pour %s', (typeProperty, details, expected) => {
    render(<PropertyInformations property={property({ typeProperty, ...details } as Partial<Property>)} />)
    expect(screen.getByText(expected)).toBeVisible()
  })
})
