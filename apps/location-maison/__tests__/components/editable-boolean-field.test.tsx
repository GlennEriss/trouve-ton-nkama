import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { EditableBooleanField } from '@/components/shared/EditableBooleanField'

describe('EditableBooleanField', () => {
  it('affiche la valeur (Oui/Non) et le crayon, pas encore en edition', () => {
    render(<EditableBooleanField value={false} onSave={jest.fn()} />)
    expect(screen.getByText('Non')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Oui' })).not.toBeInTheDocument()
  })

  it('clic sur le crayon affiche les deux boutons Oui/Non, valeur initiale = value', () => {
    render(<EditableBooleanField value={true} onSave={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    expect(screen.getByRole('button', { name: 'Oui' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Non' })).toBeInTheDocument()
  })

  it('Enregistrer appelle onSave avec la valeur choisie', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined)
    render(<EditableBooleanField value={false} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    fireEvent.click(screen.getByRole('button', { name: 'Oui' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(true))
  })

  it('Annuler revient en mode affichage sans appeler onSave', () => {
    const onSave = jest.fn()
    render(<EditableBooleanField value={false} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    fireEvent.click(screen.getByRole('button', { name: 'Oui' }))
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('Non')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Oui' })).not.toBeInTheDocument()
  })

  it('affiche le message d erreur et reste en edition si onSave echoue', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Échec réseau'))
    render(<EditableBooleanField value={false} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.getByText('Échec réseau')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })
})
