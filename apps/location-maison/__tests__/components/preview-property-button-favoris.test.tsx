import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ButtonFavoris } from '@/components/preview-property/ButtonFavoris'

let currentUser: any
const updateSession = jest.fn()
const trackInteraction = jest.fn()
const trackEvent = jest.fn()
const updateUser = jest.fn(async (..._args: unknown[]) => undefined)
const getPropertyById = jest.fn()

jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: currentUser }) }))
jest.mock('next-auth/react', () => ({ useSession: () => ({ update: updateSession }) }))
jest.mock('@/db/user.db', () => ({ updateUser: (...args: any[]) => updateUser(...args) }))
jest.mock('@/db/property.db', () => ({ getPropertyById: (...args: any[]) => getPropertyById(...args) }))
jest.mock('@/hooks/use-track-property-interaction', () => ({
  useTrackPropertyInteraction: () => ({ trackInteraction }),
}))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: { CTA_PROPERTY_FAVORITE_ADD_CLICK: 'fav-add', CTA_PROPERTY_FAVORITE_REMOVE_CLICK: 'fav-remove' },
  useTrackEvent: () => ({ trackEvent }),
}))

describe('ButtonFavoris', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ne rend rien sans utilisateur connecte', () => {
    currentUser = null
    const { container } = render(<ButtonFavoris idProperty="prop-1" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('ajoute l annonce aux favoris et trace l interaction', async () => {
    currentUser = { uid: 'u1', firstname: 'Glenn', lastname: 'Eriss', favoris: [] }
    getPropertyById.mockResolvedValueOnce({ title: 'Villa', createdBy: 'owner-1' })

    render(<ButtonFavoris idProperty="prop-1" />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    expect(updateUser).toHaveBeenCalledWith('u1', expect.objectContaining({ favoris: ['prop-1'] }))
    expect(updateSession).toHaveBeenCalledWith({ user: expect.objectContaining({ favoris: ['prop-1'] }) })
    expect(trackInteraction).toHaveBeenCalledWith('favorite_add', { source: 'property_details' })
    expect(trackEvent).toHaveBeenCalledWith('fav-add', { source: 'property_details', property_id: 'prop-1' })
  })

  it('retire l annonce des favoris quand elle y est deja', async () => {
    currentUser = { uid: 'u1', favoris: ['prop-1', 'prop-2'] }

    render(<ButtonFavoris idProperty="prop-1" />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    expect(updateUser).toHaveBeenCalledWith('u1', expect.objectContaining({ favoris: ['prop-2'] }))
    expect(trackInteraction).toHaveBeenCalledWith('favorite_remove', { source: 'property_details' })
    expect(getPropertyById).not.toHaveBeenCalled()
  })

  it('ignore les clics repetes pendant le chargement', async () => {
    currentUser = { uid: 'u1', favoris: [] }
    let resolveUpdate: () => void = () => {}
    updateUser.mockImplementationOnce(() => new Promise((resolve) => { resolveUpdate = () => resolve(undefined) }))
    getPropertyById.mockResolvedValueOnce({ title: 'Villa', createdBy: 'u1' })

    render(<ButtonFavoris idProperty="prop-1" />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    fireEvent.click(button)

    resolveUpdate()
    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1))
  })
})
