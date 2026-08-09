import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { AutoClaimBanner } from '@/features/announcer/listing-claim/ui'

const refreshSessionMock = jest.fn()
let mockUser: any

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: mockUser, refreshSession: refreshSessionMock }),
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn() }) }))

describe('AutoClaimBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock) = jest.fn().mockResolvedValue({ ok: true })
  })

  it("n'affiche rien sans pendingClaimNotice", () => {
    mockUser = { uid: 'u1', metadata: {} }
    const { container } = render(<AutoClaimBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le message au singulier pour 1 annonce revendiquee', () => {
    mockUser = { uid: 'u1', metadata: { pendingClaimNotice: { count: 1, claimedAt: 'now' } } }
    render(<AutoClaimBanner />)
    expect(screen.getByText(/a été automatiquement rattachée/)).toBeVisible()
  })

  it('affiche le message au pluriel et permet de fermer (dismiss + refresh session)', async () => {
    mockUser = { uid: 'u1', metadata: { pendingClaimNotice: { count: 3, claimedAt: 'now' } } }
    render(<AutoClaimBanner />)
    expect(screen.getByText(/3 annonces/)).toBeVisible()
    expect(screen.getByText(/ont été automatiquement rattachées/)).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/announcer/claim-notice/dismiss', { method: 'POST' }))
    await waitFor(() => expect(refreshSessionMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText(/3 annonces/)).not.toBeInTheDocument())
  })

  it('cache quand meme la banniere si la requete de dismiss echoue', async () => {
    mockUser = { uid: 'u1', metadata: { pendingClaimNotice: { count: 2, claimedAt: 'now' } } }
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network down'))
    render(<AutoClaimBanner />)

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    await waitFor(() => expect(screen.queryByText(/2 annonces/)).not.toBeInTheDocument())
  })
})
