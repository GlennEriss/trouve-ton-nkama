import React from 'react'
import { act, render, screen } from '@testing-library/react'

import { NotificationProvider, useNotifications } from '@/providers/NotificationProvider'

const onSnapshotMock = jest.fn()
const updateDocMock = jest.fn()

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'notifications-collection'),
  query: jest.fn((...args: unknown[]) => args),
  where: jest.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  orderBy: jest.fn((field: string, dir: string) => ({ field, dir })),
  limit: jest.fn((n: number) => ({ limit: n })),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  doc: jest.fn((_db: unknown, _collection: string, id: string) => ({ id })),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
}))

jest.mock('@/firebase/firestore', () => ({ db: {} }))

let currentUserState: { user: { uid: string } | undefined; isFirebaseConnected: boolean }
jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => currentUserState,
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn() }),
}))

const DAY_MS = 24 * 60 * 60 * 1000
const fakeTimestamp = (ms: number) => ({ toMillis: () => ms })

function makeDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data }
}

function Consumer() {
  const { notifications, unreadCount } = useNotifications()
  return (
    <div>
      <span data-testid="unread-count">{unreadCount}</span>
      <ul>
        {notifications.map((n) => (
          <li key={n.id}>{n.title}</li>
        ))}
      </ul>
    </div>
  )
}

function getUnreadHandlers() {
  return onSnapshotMock.mock.calls[0].slice(1) as [
    (snapshot: { docs: unknown[] }) => void,
    (error: { code?: string }) => void,
  ]
}

function getRecentHandlers() {
  return onSnapshotMock.mock.calls[1].slice(1) as [
    (snapshot: { docs: unknown[] }) => void,
    (error: { code?: string }) => void,
  ]
}

describe('NotificationProvider — fenêtre de fraîcheur "récent" (7 jours glissants)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    currentUserState = { user: { uid: 'user-1' }, isFirebaseConnected: true }
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('exclut une notification lue vieille de plus de 7 jours, garde celle de moins de 7 jours', () => {
    jest.useFakeTimers().setSystemTime(0)
    render(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
    )

    const [onUnread] = getUnreadHandlers()
    const [onRecent] = getRecentHandlers()

    act(() => {
      onUnread({ docs: [] })
      onRecent({
        docs: [
          makeDoc('stale', { title: 'Vieille notif (8j)', isRead: true, createdFor: 'user-1', createdAt: fakeTimestamp(-8 * DAY_MS) }),
          makeDoc('fresh', { title: 'Notif recente (3j)', isRead: true, createdFor: 'user-1', createdAt: fakeTimestamp(-3 * DAY_MS) }),
        ],
      })
    })

    expect(screen.queryByText('Vieille notif (8j)')).not.toBeInTheDocument()
    expect(screen.getByText('Notif recente (3j)')).toBeInTheDocument()
  })

  it('ne fait jamais expirer une notification non lue, meme tres ancienne', () => {
    jest.useFakeTimers().setSystemTime(0)
    render(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
    )

    const [onUnread] = getUnreadHandlers()
    const [onRecent] = getRecentHandlers()

    act(() => {
      onUnread({
        docs: [makeDoc('old-unread', { title: 'Non lue tres ancienne (30j)', isRead: false, createdFor: 'user-1', createdAt: fakeTimestamp(-30 * DAY_MS) })],
      })
      onRecent({ docs: [] })
    })

    expect(screen.getByText('Non lue tres ancienne (30j)')).toBeInTheDocument()
    expect(screen.getByTestId('unread-count')).toHaveTextContent('1')
  })

  it("refiltre periodiquement sans nouvel evenement Firestore — un onglet reste ouvert plusieurs jours voit bien la notification expirer", () => {
    // Regression : la fenetre "recent" etait figee au moment de l'abonnement (un
    // where(createdAt >= X) Firestore calcule une seule fois) — une notification restait
    // affichee indefiniment dans un onglet jamais recharge, meme largement apres ses 7 jours.
    jest.useFakeTimers().setSystemTime(0)
    render(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
    )

    const [onUnread] = getUnreadHandlers()
    const [onRecent] = getRecentHandlers()

    act(() => {
      onUnread({ docs: [] })
      // Creee il y a 6 jours et 23h : encore fraiche au moment de l'abonnement (t=0).
      onRecent({
        docs: [makeDoc('borderline', { title: 'Notif limite', isRead: true, createdFor: 'user-1', createdAt: fakeTimestamp(-(6 * DAY_MS + 23 * 60 * 60 * 1000)) })],
      })
    })
    expect(screen.getByText('Notif limite')).toBeInTheDocument()

    // Avance le temps de 2h (sans nouvel evenement onSnapshot) : la notif passe ses 7 jours.
    // Le timer periodique (15 min) doit avoir refiltre entre-temps.
    act(() => {
      jest.advanceTimersByTime(2 * 60 * 60 * 1000)
    })

    expect(screen.queryByText('Notif limite')).not.toBeInTheDocument()
  })
})
