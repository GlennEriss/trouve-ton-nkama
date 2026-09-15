import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = jest.fn(() => 'blob:mock')
}

// Bug prod corrigé : la fusion des données IA écrasait whatsappContact/callContact avec le
// numéro personnel du compte connecté dès que l'IA les laissait vides (cas normal : un seul
// numéro dans la description) — voir annonce https://www.tonnkama.com/annonce/VysA1qX7r7wITgNfcgQi
// (le numéro de l'annonceur s'affichait au lieu du numéro saisi dans l'annonce).

const mockPush = jest.fn()
const mockToast = jest.fn()
const mockCreateProperty = jest.fn()
const mockUploadPropertyImages = jest.fn()
const mockOnSubmit = jest.fn()

const currentUser = {
  uid: 'owner-1',
  callNumber: '+24174782158',
  whatsappNumber: '+24174782158',
  phoneNumbers: ['+24174782158'],
}

let aiResponseData: Record<string, unknown> = {}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { credits: 10 } } }),
}))
jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: currentUser }),
}))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))
jest.mock('@/hooks/useOnSubmitFormProperty', () => ({
  useOnSubmitFormProperty: () => ({
    onSubmit: async (finalData: unknown, uploadedImages: unknown) => {
      mockOnSubmit(finalData, uploadedImages)
      return finalData
    },
  }),
}))
jest.mock('@/hooks/useImageDropzone', () => ({
  useImageDropzone: ({ onFiles }: { onFiles: (files: File[]) => void }) => {
    // Simule une photo déjà déposée (sans passer par un vrai drag&drop) pour ne pas bloquer
    // sur "au moins une photo" — pas le sujet de ce test.
    React.useEffect(() => {
      onFiles([new File(['x'], 'photo.jpg', { type: 'image/jpeg' })])
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return { getRootProps: () => ({}), getInputProps: () => ({}), isDragActive: false, isProcessing: false }
  },
}))
jest.mock('@/components/location/LocationPicker', () => ({
  __esModule: true,
  default: () => <div data-testid="location-picker-stub" />,
}))
jest.mock('react-hook-form', () => {
  const actual = jest.requireActual('react-hook-form')
  return {
    ...actual,
    useForm: () => ({
      getValues: () => ({
        address: { district: 'Akébé', city: 'Libreville', province: 'Estuaire' },
        cityPlaceId: 'catalog:city:libreville',
        districtPlaceId: 'catalog:district:akebe',
        locationSource: 'OFFICIAL_CATALOG',
        country: 'Gabon',
        countryCode: 'GA',
        longitude: 9.45,
        latitude: 0.39,
        isLocExact: false,
      }),
      formState: {},
      control: {},
      watch: () => undefined,
      setValue: jest.fn(),
    }),
  }
})
jest.mock('@/directors/factory.director', () => ({
  DirectorFactory: { createDirectorProperty: () => ({ build: () => ({}) }) },
}))
jest.mock('@/db/file.db', () => ({
  uploadPropertyImages: (...args: unknown[]) => mockUploadPropertyImages(...args),
}))
jest.mock('@/db/property.db', () => ({
  createProperty: (...args: unknown[]) => mockCreateProperty(...args),
}))
jest.mock('@/lib/observability/submission-performance', () => ({
  createSubmissionPerformanceTracker: () => ({
    submissionId: 'sub-1',
    measure: (_name: string, fn: () => unknown) => fn(),
  }),
}))
// Schémas identité : seule la fusion des champs de contact est testée ici, pas la validation
// zod complète (déjà couverte ailleurs).
jest.mock('@/models/schema', () => {
  const identity = { parse: (data: unknown) => data }
  return {
    ApartmentSchema: identity, BuildingSchema: identity, DeskSchema: identity, HomeSchema: identity,
    StudioSchema: identity, ShopSchema: identity, KioskSchema: identity, RoomSchema: identity,
    VillaSchema: identity, DuplexSchema: identity, WarehouseSchema: identity, PropertySchema: identity,
  }
})

import CreatePropertyWithAIPage from '@/app/(protected)/property/create/page'

async function generate() {
  render(<CreatePropertyWithAIPage />)

  fireEvent.change(screen.getByLabelText('Description du bien'), {
    target: { value: 'Studio meublé à louer, contact 077000000.' },
  })

  await waitFor(() => expect(screen.getByRole('button', { name: /Générer l'annonce/ })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: /Générer l'annonce/ }))

  await waitFor(() => expect(mockCreateProperty).toHaveBeenCalledTimes(1))
}

describe('CreatePropertyWithAIPage — fusion des champs de contact IA', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUploadPropertyImages.mockResolvedValue([{ fileURL: 'https://cdn.test/photo.jpg', filePATH: 'photo.jpg' }])
    mockCreateProperty.mockResolvedValue('property-1')
    global.fetch = jest.fn().mockImplementation(async () => ({
      json: async () => ({ success: true, data: aiResponseData }),
    })) as unknown as typeof fetch
  })

  it("ne remplit JAMAIS whatsappContact/callContact avec le numéro du compte connecté quand l'IA les laisse vides (cas normal : un seul numéro dans la description)", async () => {
    aiResponseData = {
      typeProperty: 'Home',
      contact: '+24177001111',
      // whatsappContact/callContact volontairement absents : comportement normal du prompt IA
      // pour un seul numéro dans la description.
    }

    await generate()

    const [property] = mockCreateProperty.mock.calls[0]
    expect(property.contact).toBe('+24177001111')
    expect(property.whatsappContact).toBe('')
    expect(property.callContact).toBe('')
    expect(property.whatsappContact).not.toBe(currentUser.whatsappNumber)
    expect(property.callContact).not.toBe(currentUser.callNumber)
  })

  it("respecte un whatsappContact/callContact explicitement extrait par l'IA (description avec plusieurs numéros distincts)", async () => {
    aiResponseData = {
      typeProperty: 'Home',
      contact: '+24177001111',
      whatsappContact: '+24177002222',
      callContact: '+24177003333',
    }

    await generate()

    const [property] = mockCreateProperty.mock.calls[0]
    expect(property.contact).toBe('+24177001111')
    expect(property.whatsappContact).toBe('+24177002222')
    expect(property.callContact).toBe('+24177003333')
  })

  it("ne retombe sur le numéro du compte connecté QUE pour `contact`, et seulement si l'IA n'a trouvé aucun numéro du tout", async () => {
    aiResponseData = {
      typeProperty: 'Home',
      // Aucun numéro dans la description : seul cas légitime où l'annonce doit rester
      // joignable via le numéro du compte connecté.
    }

    await generate()

    const [property] = mockCreateProperty.mock.calls[0]
    expect(property.contact).toBe(currentUser.callNumber)
    expect(property.whatsappContact).toBe('')
    expect(property.callContact).toBe('')
  })
})
