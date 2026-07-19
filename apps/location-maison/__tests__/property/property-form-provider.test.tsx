import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockCreateProperty = jest.fn()
const mockUpdateProperty = jest.fn()
const mockPrepareProperty = jest.fn()
const mockUpdateSuggestion = jest.fn()
const mockToast = jest.fn()
const mockPush = jest.fn()
const mockInvalidateQueries = jest.fn()
const mockClearStorage = jest.fn()
const mockClearDraftImages = jest.fn()

const currentUser = {
  user: { uid: 'owner-1', role: 'ANNOUNCER', phoneNumbers: ['+24166545430'] } as any,
  isFirebaseConnected: true,
}

const formValues = {
  images: ['https://cdn.test/property.jpg'],
  title: 'Maison lumineuse à Akébé',
  description: 'Maison lumineuse, propre et proche de toutes les commodités.',
  price: 150000,
  area: 80,
  status: 'FOR_RENT',
  isOwner: true,
  tags: ['calme'],
  address: { district: 'Akébé', city: 'Libreville', province: 'Estuaire' },
  contact: '+24166545430',
  longitude: 9.45,
  latitude: 0.39,
  country: 'Gabon',
  countryCode: 'GA',
  nbrRooms: 3,
  nbrKitchens: 1,
  nbrBathrooms: 2,
  nbrToilets: 2,
  nbrGarages: 1,
  nbrFloors: 1,
  nbrLivingRoom: 1,
}

const formApi = {
  getValues: jest.fn((name?: string) => name ? (formValues as any)[name] : formValues),
  setValue: jest.fn(),
  reset: jest.fn(),
  clearErrors: jest.fn(),
  trigger: jest.fn().mockResolvedValue(true),
  handleSubmit: jest.fn((onValid: (data: typeof formValues) => unknown) => (
    event: React.FormEvent,
  ) => {
    event.preventDefault()
    return onValid(formValues)
  }),
  formState: {},
}

jest.mock('react-hook-form', () => ({
  useForm: () => formApi,
}))

jest.mock('@hookform/resolvers/zod', () => ({ zodResolver: () => jest.fn() }))

jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => currentUser,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@/hooks/use-lastpath', () => ({ __esModule: true, default: () => 'property-1' }))
jest.mock('@/hooks/useFormPropertyType', () => ({ useFormPropertyType: () => ({ typeProperty: 'Home' }) }))
jest.mock('@/hooks/usePropertyFormSchema', () => ({
  usePropertyFormSchema: () => ({
    currentStepSchema: {},
    fullSchema: { parse: (data: unknown) => data },
  }),
}))
jest.mock('@/hooks/usePropertyFormStorage', () => ({
  usePropertyFormStorage: () => ({
    clearFormLocalStorage: mockClearStorage,
    loadFormFromStorage: jest.fn(),
    saveCurrentFormData: jest.fn(),
  }),
}))
jest.mock('@/hooks/usePropertyDraftImagesStorage', () => ({
  usePropertyDraftImagesStorage: () => ({
    saveDraftImages: jest.fn(),
    loadDraftImages: jest.fn().mockResolvedValue([]),
    clearDraftImages: mockClearDraftImages,
  }),
}))
jest.mock('@/hooks/useOnSubmitFormProperty', () => ({
  useOnSubmitFormProperty: () => ({
    onSubmit: (...args: unknown[]) => mockPrepareProperty(...args),
  }),
}))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))
jest.mock('@/db/property.db', () => ({
  createProperty: (...args: unknown[]) => mockCreateProperty(...args),
  updateProperty: (...args: unknown[]) => mockUpdateProperty(...args),
}))
jest.mock('@/db/suggestion.db', () => ({
  updateOrCreateSuggestion: (...args: unknown[]) => mockUpdateSuggestion(...args),
}))
jest.mock('@/lib/invalidate-property-count-cache', () => ({
  invalidatePropertyCountCache: jest.fn(),
}))
jest.mock('@/lib/auth/role-routing', () => ({
  isAnnouncer: (user: { role?: string } | null) => user?.role === 'ANNOUNCER',
}))
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useMutation: (config: any) => ({
    mutateAsync: async (data: unknown) => {
      try {
        const result = await config.mutationFn(data)
        config.onSuccess?.(result)
        return result
      } catch (error) {
        config.onError?.(error)
        throw error
      }
    },
  }),
}))
jest.mock('@/components/property-publish/PublishAuthModal', () => ({
  PublishAuthModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <button type="button" onClick={onClose}>Connexion requise</button> : null
  ),
}))

import {
  PropertyFormComponentProvider,
  usePropertyFormComponentContext,
} from '@/providers/property.form.provider'

function SubmitHarness() {
  const { activeStep, setActiveStep, isFinalSubmitting } = usePropertyFormComponentContext()

  return (
    <>
      <span data-testid="step">{activeStep}</span>
      <span data-testid="submitting">{String(isFinalSubmitting)}</span>
      <button type="button" onClick={() => setActiveStep(2)}>Dernière étape</button>
      <button type="submit">Publier</button>
    </>
  )
}

describe('PropertyFormComponentProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.scrollTo = jest.fn()
    currentUser.user = {
      uid: 'owner-1',
      role: 'ANNOUNCER',
      phoneNumbers: ['+24166545430'],
    }
    currentUser.isFirebaseConnected = true
    mockPrepareProperty.mockResolvedValue({
      ...formValues,
      street: 'Akébé',
      city: 'Libreville',
      province: 'Estuaire',
      moderationStatus: 'PENDING',
    })
    mockCreateProperty.mockResolvedValue('property-1')
    mockUpdateProperty.mockResolvedValue(true)
    mockUpdateSuggestion.mockResolvedValue(undefined)
    mockClearDraftImages.mockResolvedValue(undefined)
  })

  it('bloque deux soumissions finales déclenchées dans le même instant', async () => {
    render(
      <PropertyFormComponentProvider>
        <SubmitHarness />
      </PropertyFormComponentProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dernière étape' }))
    const submit = screen.getByRole('button', { name: 'Publier' })
    fireEvent.click(submit)
    fireEvent.click(submit)

    await waitFor(() => expect(mockCreateProperty).toHaveBeenCalledTimes(1))
    expect(mockPrepareProperty).toHaveBeenCalledTimes(1)
    expect(mockUpdateSuggestion).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledTimes(1)
  })

  it('conserve l annonce et demande une connexion au visiteur', async () => {
    currentUser.user = null
    currentUser.isFirebaseConnected = false

    render(
      <PropertyFormComponentProvider>
        <SubmitHarness />
      </PropertyFormComponentProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dernière étape' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publier' }))

    expect(await screen.findByRole('button', { name: 'Connexion requise' })).toBeInTheDocument()
    expect(mockPrepareProperty).not.toHaveBeenCalled()
    expect(mockCreateProperty).not.toHaveBeenCalled()
  })

  it('repasse une annonce rejetée en attente lors de sa modification', async () => {
    render(
      <PropertyFormComponentProvider
        isUpdate
        propertyToUpdated={{
          ...formValues,
          typeProperty: 'Home',
          moderationStatus: 'REJECTED',
          rejectionReason: 'Téléphone incorrect',
        } as any}
      >
        <SubmitHarness />
      </PropertyFormComponentProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dernière étape' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publier' }))

    await waitFor(() => expect(mockUpdateProperty).toHaveBeenCalledTimes(1))
    expect(mockUpdateProperty).toHaveBeenCalledWith(
      'property-1',
      expect.objectContaining({
        moderationStatus: 'PENDING',
        rejectionReason: null,
      }),
    )
    expect(mockCreateProperty).not.toHaveBeenCalled()
  })
})
