import React from 'react'
import { render, screen } from '@testing-library/react'

import Tag from '@/components/preview-property/Tag'

describe('Tag', () => {
  it('affiche le nom fourni', () => {
    render(<Tag name="Piscine" />)
    expect(screen.getByText('Piscine')).toBeInTheDocument()
  })

  it('applique une couleur de fond deterministe pour un meme nom', () => {
    const { container: first } = render(<Tag name="Balcon" />)
    const { container: second } = render(<Tag name="Balcon" />)
    const firstColor = (first.firstChild as HTMLElement).style.backgroundColor
    const secondColor = (second.firstChild as HTMLElement).style.backgroundColor
    expect(firstColor).toBeTruthy()
    expect(firstColor).toBe(secondColor)
  })
})
