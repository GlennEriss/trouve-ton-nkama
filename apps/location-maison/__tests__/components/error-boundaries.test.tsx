import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

import ErrorBoundary from '@/app/error'
import GlobalError from '@/app/global-error'

describe('error.tsx (limite d erreur de segment)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: jest.fn() },
      writable: true,
    })
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => jest.restoreAllMocks())

  it('affiche un message convivial avec Réessayer et un retour à l accueil', () => {
    const reset = jest.fn()
    render(<ErrorBoundary error={new Error('boom')} reset={reset} />)

    expect(screen.getByText('Un problème est survenu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reset).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: /accueil/i })).toHaveAttribute('href', '/')
  })
})

describe('global-error.tsx (limite d erreur racine)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: jest.fn() },
      writable: true,
    })
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => jest.restoreAllMocks())

  it('affiche un message convivial autonome (sans dependre du layout normal)', () => {
    const reset = jest.fn()
    render(<GlobalError error={new Error('boom')} reset={reset} />)

    expect(screen.getByText('Un problème est survenu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
