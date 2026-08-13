import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import SearchWithAIAccessNoticeDialog from '@/components/search/SearchWithAIAccessNoticeDialog'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
jest.mock('@trouve-ton-nkama/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@trouve-ton-nkama/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h1>{children}</h1>,
}))

describe('SearchWithAIAccessNoticeDialog', () => {
  const onOpenChange = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ne rend rien quand ferme', () => {
    const { container } = render(<SearchWithAIAccessNoticeDialog open={false} onOpenChange={onOpenChange} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le message et les liens de connexion/inscription', () => {
    render(<SearchWithAIAccessNoticeDialog open onOpenChange={onOpenChange} />)
    expect(screen.getByText('Recherche IA réservée aux membres')).toBeInTheDocument()
    expect(screen.getByText('Se connecter').closest('a')).toHaveAttribute('href', '/signin')
    expect(screen.getByText('Créer un compte').closest('a')).toHaveAttribute('href', '/signup')
  })

  it('ferme la modale au clic sur Plus tard', () => {
    render(<SearchWithAIAccessNoticeDialog open onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByText('Plus tard'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
