import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LabelWithHelp } from '@/components/shared/form/FieldHelp'

describe('LabelWithHelp', () => {
  it('affiche le libellé et l astérisque requis, sans les masquer derrière le bouton d aide', () => {
    render(<LabelWithHelp htmlFor="ad-url" label="Lien au clic" required help="peu importe" />)
    expect(screen.getByText(/Lien au clic/)).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('n expose pas le libellé du champ dans le nom accessible du bouton d aide (evite les collisions getByLabelText)', () => {
    render(<LabelWithHelp htmlFor="ad-url" label="Lien au clic" help="peu importe" />)
    const helpButton = screen.getByRole('button')
    expect(helpButton.getAttribute('aria-label')).not.toMatch(/Lien au clic/i)
  })

  it("révèle l'explication seulement au clic sur le bouton d'aide", () => {
    render(
      <LabelWithHelp
        htmlFor="ad-url"
        label="Lien au clic"
        help="Un numéro à appeler fonctionne aussi (tel:+241...)."
      />,
    )
    expect(screen.queryByText(/numéro à appeler/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/numéro à appeler/i)).toBeInTheDocument()
  })
})
