import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

import CarouselProperty from '@/components/preview-property/CarouselProperty'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, onClick, src }: any) => <img alt={alt} data-src={src} onClick={onClick} />,
}))

const scrollToMock = jest.fn()
let capturedOnSelect: (() => void) | undefined

jest.mock('@trouve-ton-nkama/ui/carousel', () => ({
  Carousel: ({ children, setApi }: any) => {
    // Reproduit le contrat d'embla : le carrousel remonte son api au parent, qui s'en sert
    // pour piloter la bande de miniatures.
    React.useEffect(() => {
      setApi?.({
        selectedScrollSnap: () => 0,
        scrollTo: scrollToMock,
        on: (_event: string, handler: () => void) => { capturedOnSelect = handler },
        off: () => {},
      })
    }, [setApi])
    return <div>{children}</div>
  },
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
  CarouselPrevious: () => <button aria-label="Previous">prev</button>,
  CarouselNext: () => <button aria-label="Next">next</button>,
}))
jest.mock('react-swipeable', () => ({ useSwipeable: () => ({}) }))

const images = ['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg']

function openLightbox(photoNumber = 1) {
  fireEvent.click(screen.getByLabelText(`Agrandir la photo ${photoNumber}`))
}

describe('CarouselProperty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnSelect = undefined
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('affiche un etat vide sans image valide', () => {
    render(<CarouselProperty images={['', '  ']} />)
    expect(screen.getByText('Aucune photo disponible')).toBeInTheDocument()
  })

  it('affiche toutes les images valides du carousel', () => {
    render(<CarouselProperty images={images} />)
    expect(screen.getAllByAltText(/Photo \d de l'annonce/)).toHaveLength(3)
  })

  it('ouvre l apercu au clic et bloque le scroll', () => {
    render(<CarouselProperty images={images} />)
    openLightbox(1)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('boucle vers le debut/la fin en navigant au-dela des bornes', () => {
    render(<CarouselProperty images={images} />)
    openLightbox(3)
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Image suivante'))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Image précédente'))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('ferme l apercu et retablit le scroll', () => {
    render(<CarouselProperty images={images} />)
    openLightbox(1)
    fireEvent.click(screen.getByLabelText('Fermer la photo'))
    expect(screen.queryByText('1 / 3')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('unset')
  })

  it('navigue au clavier et ferme avec Echap', () => {
    render(<CarouselProperty images={images} />)
    openLightbox(1)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('2 / 3')).not.toBeInTheDocument()
  })

  it('selectionne une miniature directement dans l apercu', () => {
    render(<CarouselProperty images={images} />)
    openLightbox(1)
    // Deux jeux de miniatures existent (galerie + lightbox) : on vise celui de la lightbox.
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByLabelText('Voir la photo 3'))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('rend l apercu dans un portail attache au body', () => {
    // La navbar desktop est `sticky md:z-50` : rendue dans l'arbre de la page, la barre du haut
    // de la lightbox — donc son bouton de fermeture — passait dessous et devenait inatteignable.
    render(<CarouselProperty images={images} />)
    openLightbox(1)

    const dialog = screen.getByRole('dialog')
    expect(dialog.parentElement).toBe(document.body)
    expect(Number(dialog.style.zIndex)).toBeGreaterThan(50)
    expect(within(dialog).getByLabelText('Fermer la photo')).toBeVisible()
  })

  it('ferme l apercu au clic sur le fond mais pas au clic sur la photo', () => {
    render(<CarouselProperty images={images} />)
    openLightbox(1)

    fireEvent.click(screen.getByAltText("Photo de l'annonce en plein écran"))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.queryByText('1 / 3')).not.toBeInTheDocument()
  })

  it('affiche une bande de miniatures qui pilote le carrousel', () => {
    render(<CarouselProperty images={images} />)

    fireEvent.click(screen.getAllByLabelText('Voir la photo 2')[0])
    expect(scrollToMock).toHaveBeenCalledWith(1)
    // Le composant s'abonne bien aux changements de slide pour surligner la bonne miniature.
    expect(capturedOnSelect).toBeInstanceOf(Function)
  })

  it('masque fleches et miniatures avec une seule photo', () => {
    render(<CarouselProperty images={['https://cdn/solo.jpg']} />)

    expect(screen.queryByLabelText('Previous')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Voir la photo 1')).not.toBeInTheDocument()

    openLightbox(1)
    expect(screen.queryByLabelText('Image suivante')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Fermer la photo')).toBeVisible()
  })
})
