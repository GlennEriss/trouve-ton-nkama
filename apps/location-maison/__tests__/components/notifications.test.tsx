import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import Notifications from '@/components/navbar/Notifications'

const markAllAsRead = jest.fn()
const markAsRead = jest.fn()
let notificationsState: { notifications: unknown[]; unreadCount: number }

jest.mock('@/providers/NotificationProvider', () => ({
  useNotifications: () => ({ ...notificationsState, markAllAsRead, markAsRead }),
}))

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: { firstname: 'Glenn', lastname: 'Eriss' } }),
}))

describe('Notifications (bouton cloche)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    notificationsState = { notifications: [], unreadCount: 0 }
  })

  it('ouvre le panneau de notifications au clic sur la cloche', () => {
    // Regression : NotificationButton ne repercutait pas les props injectees par
    // <PopoverTrigger asChild> (onClick, aria-expanded...) sur le <Button> reel — le clic
    // ne faisait plus rien. Voir NotificationComponents.tsx (...rest sur NotificationButton).
    render(<Notifications />)

    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les notifications' }))

    expect(screen.getByText('Notifications')).toBeVisible()
    expect(screen.getByText('Aucune notification pour le moment')).toBeVisible()
  })

  it('affiche le badge et permet de tout marquer comme lu', () => {
    notificationsState = {
      unreadCount: 2,
      notifications: [
        { id: 'n1', title: 'Titre 1', message: 'Message 1', isRead: false, createdAt: new Date().toISOString() },
        { id: 'n2', title: 'Titre 2', message: 'Message 2', isRead: false, createdAt: new Date().toISOString() },
      ],
    }
    render(<Notifications />)

    expect(screen.getByText('2')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les notifications' }))
    expect(screen.getByText('Titre 1')).toBeVisible()
    expect(screen.getByText('Titre 2')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Tout marquer comme lu' }))
    expect(markAllAsRead).toHaveBeenCalledTimes(1)
  })
})
