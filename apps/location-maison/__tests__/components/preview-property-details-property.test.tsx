import React from 'react'
import { render, screen } from '@testing-library/react'

import DetailsProperty from '@/components/preview-property/DetailsProperty'

describe('DetailsProperty', () => {
  it('Apartment: affiche chambres, cuisines, salles de bain et toilettes', () => {
    render(
      <DetailsProperty
        property={{ typeProperty: 'Apartment', nbrRooms: 3, nbrKitchens: 1, nbrBathrooms: 2, nbrToilets: 1 } as any}
      />,
    )
    expect(screen.getByText('Chambres')).toBeInTheDocument()
    expect(screen.getByText('Cuisines')).toBeInTheDocument()
    expect(screen.getByText('Salles de bain')).toBeInTheDocument()
    expect(screen.getByText('Toilettes')).toBeInTheDocument()
  })

  it('Apartment: retombe sur nbrChickens si nbrKitchens est absent (typo historique)', () => {
    render(
      <DetailsProperty
        property={{ typeProperty: 'Apartment', nbrRooms: 1, nbrChickens: 4, nbrBathrooms: 1, nbrToilets: 1 } as any}
      />,
    )
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('Building: affiche etages, parking et appartements', () => {
    render(
      <DetailsProperty
        property={{ typeProperty: 'Building', nbrFloors: 5, hasParking: true, nbrApartments: 12 } as any}
      />,
    )
    expect(screen.getByText('Étages')).toBeInTheDocument()
    expect(screen.getByText('Parking')).toBeInTheDocument()
    expect(screen.getByText('Appartements')).toBeInTheDocument()
  })

  it('Desk: affiche toilettes et salles', () => {
    render(<DetailsProperty property={{ typeProperty: 'Desk', nbrToilets: 2, nbrRooms: 3 } as any} />)
    expect(screen.getByText('Toilettes')).toBeInTheDocument()
    expect(screen.getByText('Salles')).toBeInTheDocument()
  })

  it('Home: affiche logement, salon, etages et garages', () => {
    render(
      <DetailsProperty
        property={{
          typeProperty: 'Home',
          nbrRooms: 4,
          nbrKitchens: 1,
          nbrBathrooms: 2,
          nbrToilets: 2,
          nbrLivingRoom: 1,
          nbrFloors: 2,
          nbrGarages: 1,
        } as any}
      />,
    )
    expect(screen.getByText('Salons')).toBeInTheDocument()
    expect(screen.getByText('Étages')).toBeInTheDocument()
    expect(screen.getByText('Garages')).toBeInTheDocument()
  })

  it('Villa: affiche etages, piscines et garages', () => {
    render(
      <DetailsProperty
        property={{
          typeProperty: 'Villa',
          nbrRooms: 5,
          nbrKitchens: 2,
          nbrBathrooms: 3,
          nbrToilets: 3,
          nbrFloors: 2,
          nbrPiscine: 1,
          nbrGarages: 2,
        } as any}
      />,
    )
    expect(screen.getByText('Piscines')).toBeInTheDocument()
  })

  it('Shop: affiche salles et toilettes', () => {
    render(<DetailsProperty property={{ typeProperty: 'Shop', nbrRooms: 2, nbrToilet: 1 } as any} />)
    expect(screen.getByText('Salles')).toBeInTheDocument()
    expect(screen.getByText('Toilettes')).toBeInTheDocument()
  })

  it('Kiosk: affiche le type de kiosque', () => {
    render(<DetailsProperty property={{ typeProperty: 'Kiosk', kioskType: 'Alimentation' } as any} />)
    expect(screen.getByText('Type: Alimentation')).toBeInTheDocument()
  })

  it('Room: affiche le type de chambre', () => {
    render(<DetailsProperty property={{ typeProperty: 'Room', roomType: 'Chambre simple' } as any} />)
    expect(screen.getByText('Chambre simple')).toBeInTheDocument()
  })

  it('type par defaut (terrain): affiche la superficie', () => {
    render(<DetailsProperty property={{ typeProperty: 'Land', area: 500 } as any} />)
    expect(screen.getByText('500 m²')).toBeInTheDocument()
    expect(screen.getByText('Superficie')).toBeInTheDocument()
  })
})
