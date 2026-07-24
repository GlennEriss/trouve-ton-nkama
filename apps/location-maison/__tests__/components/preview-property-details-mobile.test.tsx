import React from 'react'
import { render, screen } from '@testing-library/react'

import { DetailsPropertyMobile } from '@/components/preview-property/DetailsPropertyMobile'

describe('DetailsPropertyMobile', () => {
  it('Villa: affiche piscine Oui mais pas Salons', () => {
    render(
      <DetailsPropertyMobile
        property={{
          typeProperty: 'Villa',
          nbrRooms: 4,
          nbrKitchens: 1,
          nbrBathrooms: 2,
          nbrFloors: 2,
          nbrGarages: 1,
          nbrPiscine: 1,
        } as any}
      />,
    )
    expect(screen.getByText('Piscine')).toBeInTheDocument()
    expect(screen.getByText('Oui')).toBeInTheDocument()
    expect(screen.queryByText('Salons')).not.toBeInTheDocument()
  })

  it('Home: affiche Salons mais pas Piscine', () => {
    render(
      <DetailsPropertyMobile
        property={{
          typeProperty: 'Home',
          nbrRooms: 3,
          nbrChickens: 2,
          nbrBathrooms: 1,
          nbrFloors: 1,
          nbrGarages: 0,
          nbrLivingRoom: 1,
        } as any}
      />,
    )
    expect(screen.getByText('Salons')).toBeInTheDocument()
    expect(screen.queryByText('Piscine')).not.toBeInTheDocument()
    // Garages a 0 est masque
    expect(screen.queryByText('Garages')).not.toBeInTheDocument()
    // nbrChickens sert de repli quand nbrKitchens est absent
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('Apartment: affiche l etage et le numero via les alias Studio', () => {
    render(
      <DetailsPropertyMobile
        property={{
          typeProperty: 'Apartment',
          nbrRooms: 2,
          nbrKitchens: 1,
          nbrBathrooms: 1,
          nbrFloorStudio: 3,
          numeroStudio: 'A12',
        } as any}
      />,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('A12')).toBeInTheDocument()
  })

  it('Building: affiche parking Non quand hasParking est false', () => {
    render(
      <DetailsPropertyMobile
        property={{ typeProperty: 'Building', nbrFloors: 4, nbrApartments: 10, hasParking: false } as any}
      />,
    )
    expect(screen.getByText('Non')).toBeInTheDocument()
  })

  it('Desk: affiche bureaux et toilettes', () => {
    render(<DetailsPropertyMobile property={{ typeProperty: 'Desk', nbrRooms: 5, nbrToilets: 2 } as any} />)
    expect(screen.getByText('Bureaux')).toBeInTheDocument()
    expect(screen.getByText('Toilettes')).toBeInTheDocument()
  })

  it('Shop: affiche salles et toilettes', () => {
    render(<DetailsPropertyMobile property={{ typeProperty: 'Shop', nbrRooms: 2, nbrToilet: 1 } as any} />)
    expect(screen.getByText('Salles')).toBeInTheDocument()
  })

  it('Kiosk: affiche le type de kiosque dans une carte centree', () => {
    render(<DetailsPropertyMobile property={{ typeProperty: 'Kiosk', kioskType: 'Alimentation' } as any} />)
    expect(screen.getByText('Alimentation')).toBeInTheDocument()
  })

  it('Room: affiche le type de chambre', () => {
    render(<DetailsPropertyMobile property={{ typeProperty: 'Room', roomType: 'Simple' } as any} />)
    expect(screen.getByText('Simple')).toBeInTheDocument()
  })

  it('type par defaut: affiche la superficie', () => {
    render(<DetailsPropertyMobile property={{ typeProperty: 'Land', area: 800 } as any} />)
    expect(screen.getByText('800')).toBeInTheDocument()
    expect(screen.getByText('Superficie (m²)')).toBeInTheDocument()
  })

  it('ne rend aucune carte quand la superficie par defaut est nulle', () => {
    const { container } = render(<DetailsPropertyMobile property={{ typeProperty: 'Land', area: 0 } as any} />)
    expect(container.querySelectorAll('.border-gray-200').length).toBe(0)
  })
})
