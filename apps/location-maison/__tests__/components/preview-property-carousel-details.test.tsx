import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { CarouselPropertyDetails } from '@/components/preview-property/CarouselPropertyDetails'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, onLoad, onClick, src }: any) => (
    <img alt={alt} data-src={src} onClick={onClick} onLoad={onLoad} />
  ),
}))
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: (props: any) => <div data-testid="skeleton" {...props} /> }))
jest.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: any) => <div>{children}</div>,
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
  CarouselPrevious: () => <button aria-label="Previous">prev</button>,
  CarouselNext: () => <button aria-label="Next">next</button>,
}))
jest.mock('react-swipeable', () => ({ useSwipeable: () => ({}) }))

const images = [{ fileURL: 'https://cdn/a.jpg' }, { fileURL: 'https://cdn/b.jpg' }, { fileURL: 'https://cdn/c.jpg' }] as any

describe('CarouselPropertyDetails', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('affiche un etat vide quand aucune photo n est disponible', () => {
    render(<CarouselPropertyDetails images={[]} />)
    expect(screen.getByText('Aucune photo disponible')).toBeInTheDocument()
  })

  it('affiche le carousel principal avec toutes les images', () => {
    render(<CarouselPropertyDetails images={images} />)
    expect(screen.getAllByRole('img')).toHaveLength(3)
  })

  it('ouvre l apercu plein ecran au clic sur une image et bloque le scroll', () => {
    render(<CarouselPropertyDetails images={images} />)
    fireEvent.click(screen.getAllByRole('img')[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('navigue au suivant/precedent et ferme via le bouton', () => {
    render(<CarouselPropertyDetails images={images} />)
    fireEvent.click(screen.getAllByRole('img')[0])
    fireEvent.click(screen.getByLabelText('Photo suivante'))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Photo précédente'))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Fermer l'aperçu"))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('navigue au clavier (fleches et echap)', () => {
    render(<CarouselPropertyDetails images={images} />)
    fireEvent.click(screen.getAllByRole('img')[0])
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ferme au clic sur le fond mais pas sur le contenu', () => {
    render(<CarouselPropertyDetails images={images} />)
    fireEvent.click(screen.getAllByRole('img')[0])
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('permet de choisir une photo via les miniatures', () => {
    render(<CarouselPropertyDetails images={images} />)
    fireEvent.click(screen.getAllByRole('img')[0])
    fireEvent.click(screen.getByLabelText('Afficher la photo 3'))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })
})
