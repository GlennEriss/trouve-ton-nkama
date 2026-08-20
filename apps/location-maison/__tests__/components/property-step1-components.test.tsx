import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import {
  AreaComponent,
  DescriptionComponent,
  ImageUploader,
  ImagesComponent,
  IsOwnerComponent,
  PriceComponent,
  RenderImage,
  StatusComponent,
  TagItem,
  TagsComponent,
  TitleComponent,
} from '@/components/stepper/step1.components'

const toastMock = jest.fn()
const watchMock = jest.fn()
const mediator: Record<string, jest.Mock> = {}
let mockDropzoneOptions: any
let mockDragActive = false
let mockProcessing = false
let mockTags: any[] = []

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, ...props }: any) => <img {...props} />,
}))

jest.mock('react-hook-form', () => ({ useFormContext: () => ({ watch: watchMock }) }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
jest.mock('@/hooks/useStep1FormPropertyMediator', () => ({ useStep1FormPropertyMediator: () => mediator }))
jest.mock('@/hooks/useBlobUrl', () => ({ useBlobUrl: () => 'blob:preview' }))
jest.mock('@/hooks/useDynamicTags', () => ({ useDynamicTags: () => ({ tagOptions: mockTags }) }))
jest.mock('@/hooks/useImageDropzone', () => ({
  useImageDropzone: (options: any) => {
    mockDropzoneOptions = options
    return {
      getInputProps: () => ({ type: 'file' }),
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      isDragActive: mockDragActive,
      isProcessing: mockProcessing,
    }
  },
}))

jest.mock('@/components/ui/form', () => ({
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormControl: ({ children }: any) => <>{children}</>,
  FormLabel: ({ children }: any) => <span>{children}</span>,
}))
jest.mock('@/components/shared/ui/InputApp', () => ({
  InputApp: ({ value, onChange, ...props }: any) => <input value={value ?? ''} onChange={onChange} {...props} />,
}))
jest.mock('@/components/shared/ui/TextareaApp', () => ({
  __esModule: true,
  default: ({ value, onChange, ...props }: any) => <textarea value={value ?? ''} onChange={onChange} {...props} />,
}))
jest.mock('@/components/shared/ui/InputNumberApp', () => ({
  InputNumberApp: ({ value, onChange, ...props }: any) => <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props} />,
}))

const Icon = () => <span>icon</span>
const file = new File(['image'], 'salon.webp', { type: 'image/webp' })

describe('composants de la première étape immobilière', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(mediator).forEach((key) => delete mediator[key])
    mockTags = [{ tagName: 'Wifi', tagIcon: Icon }, { tagName: 'Balcon', tagIcon: Icon }]
    mockDragActive = false
    mockProcessing = false
    watchMock.mockImplementation((name: string) => ({
      images: [], status: 'FOR_RENT', tags: ['Wifi'], isOwner: true,
      title: 'Maison', description: 'Belle maison', area: 80, price: 40000,
    } as any)[name])
  })

  it('affiche les images URL et fichier puis permet leur suppression', () => {
    const images = ['https://cdn.test/photo.jpg', file]
    watchMock.mockImplementation((name: string) => name === 'images' ? images : undefined)
    mediator.getImageAt = jest.fn((index) => images[index])
    mediator.removeImage = jest.fn()
    mediator.getImages = jest.fn(() => images)
    render(<ImagesComponent />)
    expect(screen.getByText('2/10 images')).toBeVisible()
    expect(screen.getByAltText('Image 1')).toHaveAttribute('src', 'https://cdn.test/photo.jpg')
    expect(screen.getByAltText('Image 2')).toHaveAttribute('src', 'blob:preview')
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(mediator.removeImage).toHaveBeenCalledWith(0)
  })

  it('affiche un emplacement manquant quand le médiateur ne fournit pas d’image', () => {
    mediator.getImageAt = jest.fn(() => undefined)
    mediator.removeImage = jest.fn()
    render(<RenderImage index={4} />)
    expect(screen.getByText('Image manquante')).toBeVisible()
  })

  it('confirme les ajouts complets et partiels', () => {
    let images: File[] = []
    mediator.getImages = jest.fn(() => images)
    mediator.addImages = jest.fn((files: File[]) => { images = files.slice(0, 1) })
    render(<ImageUploader />)
    mockDropzoneOptions.onFiles([file, new File(['x'], 'chambre.jpg')])
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Images ajoutées' }))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Certaines images n'ont pas été ajoutées", variant: 'destructive' }))
  })

  it('signale les erreurs de dépôt et les erreurs du médiateur', () => {
    mediator.getImages = jest.fn(() => [])
    mediator.addImages = jest.fn(() => { throw new Error('stockage') })
    render(<ImageUploader />)
    mockDropzoneOptions.onFiles([file])
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erreur' }))

    mockDropzoneOptions.onFeedback({
      invalidTypeCount: 1,
      tooManyFilesCount: 1,
      compressionErrorCount: 1,
    })
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining('format non supporté'),
      variant: 'destructive',
    }))
    toastMock.mockClear()
    mockDropzoneOptions.onFeedback({ invalidTypeCount: 0, tooManyFilesCount: 0, compressionErrorCount: 0 })
    expect(toastMock).not.toHaveBeenCalled()
  })

  it('affiche les états actif, glissé et traitement du dépôt', () => {
    mediator.getImages = jest.fn(() => [])
    mediator.addImages = jest.fn()
    mockDragActive = true
    const { rerender } = render(<ImageUploader />)
    expect(screen.getByText('Déposez vos images ici')).toBeVisible()

    mockDragActive = false
    mockProcessing = true
    rerender(<ImageUploader />)
    expect(screen.getByText('Traitement en cours...')).toBeVisible()
    expect(screen.getByLabelText('Ajouter des images du bien')).toBeDisabled()
  })

  it('met à jour statut, propriétaire et tags', () => {
    mediator.setStatus = jest.fn()
    mediator.setIsOwner = jest.fn()
    mediator.toggleTag = jest.fn()
    const { rerender } = render(<StatusComponent />)
    fireEvent.click(screen.getByText('A vendre').closest('[class*="cursor-pointer"]')!)
    expect(mediator.setStatus).toHaveBeenCalledWith('FOR_SALE')

    rerender(<IsOwnerComponent />)
    fireEvent.click(screen.getByText('Mandataire / Agence').closest('[class*="cursor-pointer"]')!)
    expect(mediator.setIsOwner).toHaveBeenCalledWith(false)

    rerender(<TagsComponent />)
    expect(screen.getByText('1/6 sélectionnés')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Sélectionner le tag Balcon' }))
    expect(mediator.toggleTag).toHaveBeenCalledWith('Balcon')
    expect(screen.getByRole('button', { name: 'Désélectionner le tag Wifi' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('rend un tag isolé et appelle son action', () => {
    const onToggle = jest.fn()
    const { rerender } = render(<TagItem tag={{ tagName: 'Piscine', tagIcon: Icon }} isActive={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalled()
    rerender(<TagItem tag={{ tagName: 'Piscine', tagIcon: Icon }} isActive onToggle={onToggle} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('transmet les champs de base au médiateur', () => {
    mediator.setTitle = jest.fn()
    mediator.setDescription = jest.fn()
    mediator.setArea = jest.fn()
    mediator.setPrice = jest.fn()
    const { rerender } = render(<TitleComponent />)
    fireEvent.change(screen.getByLabelText("Titre de l'annonce"), { target: { value: 'Villa moderne' } })
    expect(mediator.setTitle).toHaveBeenCalledWith('Villa moderne')

    rerender(<DescriptionComponent />)
    fireEvent.change(screen.getByLabelText("Description de l'annonce"), { target: { value: 'Très calme' } })
    expect(mediator.setDescription).toHaveBeenCalledWith('Très calme')

    rerender(<AreaComponent />)
    fireEvent.change(screen.getByLabelText('Superficie du bien en mètres carrés'), { target: { value: '120' } })
    expect(mediator.setArea).toHaveBeenCalledWith(120)

    rerender(<PriceComponent />)
    fireEvent.change(screen.getByLabelText('Prix du bien en FCFA'), { target: { value: '75000' } })
    expect(mediator.setPrice).toHaveBeenCalledWith(75000)
  })
})
