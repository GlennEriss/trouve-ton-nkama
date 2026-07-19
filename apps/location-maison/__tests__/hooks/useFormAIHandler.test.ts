import { act, renderHook } from '@testing-library/react'
import { useFormContext } from 'react-hook-form'
import { useFormAIHandler } from '@/hooks/useFormAIHandler'

const mockToast = jest.fn()
const mockSaveFormToLocalStorage = jest.fn()
const mockSaveCurrentFormData = jest.fn()
const mockProcessAIRequest = jest.fn()
const mockSendMessage = jest.fn()
const mockForm = {
  getValues: jest.fn(),
  setValue: jest.fn(),
  trigger: jest.fn(),
}

jest.mock('react-hook-form', () => ({
  useFormContext: jest.fn(),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

jest.mock('@/hooks/usePropertyFormStorage', () => ({
  usePropertyFormStorage: () => ({
    saveFormToLocalStorage: mockSaveFormToLocalStorage,
    saveCurrentFormData: mockSaveCurrentFormData,
  }),
}))

jest.mock('@/hooks/useAIAssistant', () => ({
  __esModule: true,
  default: () => ({
    sendMessage: mockSendMessage,
    creditsAvailable: 3,
    isLoading: false,
  }),
}))

jest.mock('@/factories/services/AIFormServiceFactory', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({ processAIRequest: mockProcessAIRequest }),
  },
}))

describe('useFormAIHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useFormContext as jest.Mock).mockReturnValue(mockForm)
    mockForm.getValues.mockReturnValue([])
    mockForm.trigger.mockResolvedValue(true)
  })

  it('fusionne les images puis applique les donnees IA au formulaire', async () => {
    const oldImage = new File(['old'], 'old.jpg')
    const aiImage = new File(['new'], 'ai.jpg')
    mockForm.getValues.mockReturnValue([oldImage])
    mockProcessAIRequest.mockResolvedValue({
      title: 'Belle chambre à louer à Akébé',
      description: 'Chambre confortable avec charges de courant incluses.',
      price: 40000,
      area: 20,
      optionalNull: null,
    })
    const { result } = renderHook(() => useFormAIHandler({
      propertyType: 'room',
      propertyLabel: 'Chambre',
      requiredFields: ['title', 'description', 'price'],
    }))

    let generated: unknown
    await act(async () => {
      generated = await result.current.handleGenerate(
        'Chambre à Akébé Poteau à 40k avec courant.',
        [aiImage],
      )
    })

    expect(mockForm.setValue).toHaveBeenCalledWith('images', [oldImage, aiImage], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    expect(mockProcessAIRequest).toHaveBeenCalledWith(
      'room',
      'Chambre',
      ['title', 'description', 'price'],
      'Chambre à Akébé Poteau à 40k avec courant.',
      mockSendMessage,
    )
    expect(mockSaveFormToLocalStorage).toHaveBeenCalledWith(expect.objectContaining({ price: 40000 }))
    expect(mockForm.setValue).toHaveBeenCalledWith('price', 40000, expect.any(Object))
    expect(mockForm.setValue).not.toHaveBeenCalledWith('optionalNull', expect.anything(), expect.anything())
    expect(mockForm.trigger).toHaveBeenCalled()
    expect(mockSaveCurrentFormData).toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
    expect(generated).toEqual(expect.objectContaining({ title: 'Belle chambre à louer à Akébé' }))
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.canGenerate).toBe(true)
  })

  it('limite les images ajoutees au plafond du formulaire', async () => {
    const current = Array.from({ length: 9 }, (_, index) => new File(['x'], `old-${index}.jpg`))
    const additions = Array.from({ length: 4 }, (_, index) => new File(['x'], `new-${index}.jpg`))
    mockForm.getValues.mockReturnValue(current)
    mockProcessAIRequest.mockResolvedValue({ title: 'Studio', price: 50000, area: 18 })
    const { result } = renderHook(() => useFormAIHandler({
      propertyType: 'studio',
      propertyLabel: 'Studio',
      requiredFields: [],
    }))

    await act(async () => {
      await result.current.handleGenerate('Studio à louer', additions)
    })

    const imagesCall = mockForm.setValue.mock.calls.find(([field]) => field === 'images')
    expect(imagesCall?.[1]).toHaveLength(10)
  })

  it('refuse une description vide et affiche le message dans un toast', async () => {
    const { result } = renderHook(() => useFormAIHandler({
      propertyType: 'studio',
      propertyLabel: 'Studio',
      requiredFields: [],
    }))

    await act(async () => {
      await expect(result.current.handleGenerate('   ')).rejects.toThrow(
        'Description, type de propriété et label requis',
      )
    })

    expect(mockProcessAIRequest).not.toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      description: 'Description, type de propriété et label requis',
    }))
  })

  it('propage une panne Gemini sans laisser le formulaire charge', async () => {
    mockProcessAIRequest.mockRejectedValue(new Error('Gemini indisponible'))
    const { result } = renderHook(() => useFormAIHandler({
      propertyType: 'home',
      propertyLabel: 'Maison',
      requiredFields: ['title'],
    }))

    await act(async () => {
      await expect(result.current.handleGenerate('Maison avec jardin')).rejects.toThrow('Gemini indisponible')
    })

    expect(result.current.isGenerating).toBe(false)
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      description: 'Gemini indisponible',
    }))
  })
})
