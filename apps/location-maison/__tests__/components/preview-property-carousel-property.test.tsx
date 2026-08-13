import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import CarouselProperty from '@/components/preview-property/CarouselProperty'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, onClick, src }: any) => <img alt={alt} data-src={src} onClick={onClick} />,
}))
jest.mock('@trouve-ton-nkama/ui/carousel', () => ({
  Carousel: ({ children }: any) => <div>{children}</div>,
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
  CarouselPrevious: () => <button aria-label="Previous">prev</button>,
  CarouselNext: () => <button aria-label="Next">next</button>,
}))
jest.mock('react-swipeable', () => ({ useSwipeable: () => ({}) }))

const images = ['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg']

describe('CarouselProperty', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('affiche un etat vide sans image valide', () => {
    render(<CarouselProperty images={['', '  ']} />)
    expect(screen.getByText('Aucune photo disponible')).toBeInTheDocument()
  })

  it('affiche toutes les images valides du carousel', () => {
    render(<CarouselProperty images={images} />)
    expect(screen.getAllByAltText(/Image \d/)).toHaveLength(3)
  })

  it('ouvre l apercu au clic et bloque le scroll', () => {
    render(<CarouselProperty images={images} />)
    fireEvent.click(screen.getByAltText('Image 1'))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('boucle vers le debut/la fin en navigant au-dela des bornes', () => {
    render(<CarouselProperty images={images} />)
    fireEvent.click(screen.getByAltText('Image 3'))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Image suivante'))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Image précédente'))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('ferme l apercu et retablit le scroll', () => {
    render(<CarouselProperty images={images} />)
    fireEvent.click(screen.getByAltText('Image 1'))
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(screen.queryByText('1 / 3')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('unset')
  })

  it('navigue au clavier et ferme avec Echap', () => {
    render(<CarouselProperty images={images} />)
    fireEvent.click(screen.getByAltText('Image 1'))
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('2 / 3')).not.toBeInTheDocument()
  })

  it('selectionne une miniature directement', () => {
    render(<CarouselProperty images={images} />)
    fireEvent.click(screen.getByAltText('Image 1'))
    fireEvent.click(screen.getByAltText('Miniature 3'))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })
})
