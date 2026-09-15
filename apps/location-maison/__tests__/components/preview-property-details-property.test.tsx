import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import DetailsProperty from '@/components/preview-property/DetailsProperty'

// `type="number"` a le role ARIA implicite "spinbutton" (pas "textbox") — on cible l'input
// directement plutot que par role, valable pour text/number/textarea des trois cas.
async function editField(container: HTMLElement, newValue: string) {
  fireEvent.click(within(container).getByRole('button', { name: 'Modifier' }))
  const input = container.querySelector('input, textarea') as HTMLInputElement
  fireEvent.change(input, { target: { value: newValue } })
  fireEvent.click(within(container).getByRole('button', { name: 'Enregistrer' }))
  await waitFor(() => expect(within(container).queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument())
}

function containerFor(fieldLabel: string): HTMLElement {
  return screen.getByText(fieldLabel).parentElement as HTMLElement
}

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

  it('sans typeProperty (Mode) : affiche les attributs generiques au lieu de la superficie', () => {
    render(
      <DetailsProperty
        property={{ attributes: { taille: 'M', marque: 'Nike', genre: undefined, couleur: '' } } as any}
      />,
    )
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('Nike')).toBeInTheDocument()
    expect(screen.queryByText('Superficie')).not.toBeInTheDocument()
    expect(screen.queryByText(/m²/)).not.toBeInTheDocument()
  })

  it('sans typeProperty et sans attributs : ne rend rien plutot que "undefined m²"', () => {
    const { container } = render(<DetailsProperty property={{ attributes: {} } as any} />)
    expect(container.querySelector('.p-4')?.textContent).toBe('')
  })
})

describe('DetailsProperty — édition (onSaveField)', () => {
  it("sans onSaveField, aucun crayon n'apparait (page publique en lecture seule)", () => {
    render(<DetailsProperty property={{ typeProperty: 'Apartment', nbrRooms: 3, nbrKitchens: 1, nbrBathrooms: 2, nbrToilets: 1 } as any} />)
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument()
  })

  it('Apartment : modifier "Chambres" appelle onSaveField avec { nbrRooms: <nombre> }', async () => {
    const onSaveField = jest.fn().mockResolvedValue(undefined)
    render(
      <DetailsProperty
        property={{ typeProperty: 'Apartment', nbrRooms: 3, nbrKitchens: 1, nbrBathrooms: 2, nbrToilets: 1 } as any}
        onSaveField={onSaveField}
      />,
    )

    await editField(containerFor('Chambres'), '5')

    // DetailsProperty est sans etat : l'affichage revient a la prop `property` d'origine tant
    // que le parent (PreviewPropertyDraft en vrai) ne re-rend pas avec la valeur mise a jour —
    // c'est ce re-rendu reel qui est couvert par l'e2e (property-edit-type-details.spec.ts).
    // Ce test verifie uniquement que le bon patch a ete transmis a onSaveField.
    expect(onSaveField).toHaveBeenCalledWith({ nbrRooms: 5 })
  })

  it('Apartment : une valeur non entiere negative rejette sans appeler onSaveField', async () => {
    const onSaveField = jest.fn().mockResolvedValue(undefined)
    render(
      <DetailsProperty
        property={{ typeProperty: 'Apartment', nbrRooms: 3, nbrKitchens: 1, nbrBathrooms: 2, nbrToilets: 1 } as any}
        onSaveField={onSaveField}
      />,
    )

    const container = containerFor('Chambres')
    fireEvent.click(within(container).getByRole('button', { name: 'Modifier' }))
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '-1' } })
    fireEvent.click(within(container).getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(within(container).getByText(/nombre entier positif/)).toBeInTheDocument())
    expect(onSaveField).not.toHaveBeenCalled()
    // Toujours en edition (le crayon n'est pas revenu) : la valeur d'origine n'a pas ete perdue.
    expect(within(container).getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('Building : modifier le toggle Parking appelle onSaveField avec { hasParking: true }', async () => {
    const onSaveField = jest.fn().mockResolvedValue(undefined)
    render(
      <DetailsProperty
        property={{ typeProperty: 'Building', nbrFloors: 3, hasParking: false, nbrApartments: 6 } as any}
        onSaveField={onSaveField}
      />,
    )

    const container = containerFor('Parking')
    fireEvent.click(within(container).getByRole('button', { name: 'Modifier' }))
    fireEvent.click(within(container).getByRole('button', { name: 'Oui' }))
    fireEvent.click(within(container).getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(onSaveField).toHaveBeenCalledWith({ hasParking: true }))
  })

  it('Kiosk : modifier le type de kiosque appelle onSaveField avec { kioskType }', async () => {
    const onSaveField = jest.fn().mockResolvedValue(undefined)
    const { container } = render(
      <DetailsProperty property={{ typeProperty: 'Kiosk', kioskType: 'Alimentation' } as any} onSaveField={onSaveField} />,
    )

    await editField(container, 'Boissons')

    expect(onSaveField).toHaveBeenCalledWith({ kioskType: 'Boissons' })
  })

  it('Room : modifier le type de chambre appelle onSaveField avec { roomType }', async () => {
    const onSaveField = jest.fn().mockResolvedValue(undefined)
    const { container } = render(
      <DetailsProperty property={{ typeProperty: 'Room', roomType: 'Chambre simple' } as any} onSaveField={onSaveField} />,
    )

    await editField(container, 'Chambre double')

    expect(onSaveField).toHaveBeenCalledWith({ roomType: 'Chambre double' })
  })

  it('Terrain (typeProperty par defaut) : modifier "Superficie" appelle onSaveField avec { area } (nombre, pas "750 m²")', async () => {
    const onSaveField = jest.fn().mockResolvedValue(undefined)
    render(<DetailsProperty property={{ typeProperty: 'Land', area: 500 } as any} onSaveField={onSaveField} />)

    await editField(containerFor('Superficie'), '750')

    expect(onSaveField).toHaveBeenCalledWith({ area: 750 })
  })

  it('Terrain : le format "<valeur> m²" est bien reappliqué quand la prop property change (simulateur du re-rendu parent)', () => {
    const { rerender } = render(<DetailsProperty property={{ typeProperty: 'Land', area: 500 } as any} onSaveField={jest.fn()} />)
    expect(screen.getByText('500 m²')).toBeInTheDocument()

    rerender(<DetailsProperty property={{ typeProperty: 'Land', area: 750 } as any} onSaveField={jest.fn()} />)
    expect(screen.getByText('750 m²')).toBeInTheDocument()
  })
})
