import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const currentUser = { user: { uid: 'owner-1' }, isLoading: false, isFirebaseConnected: true }
jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => currentUser,
}))

const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

const mockGetReelById = jest.fn()
const mockUpdateReelDetails = jest.fn()
jest.mock('@/db/reel.db', () => ({
  getReelById: (...args: unknown[]) => mockGetReelById(...args),
  updateReelDetails: (...args: unknown[]) => mockUpdateReelDetails(...args),
  retrimReel: jest.fn(),
  uploadRawReelVideo: jest.fn(),
  markReelUploadFailed: jest.fn(),
  buildRawReelVideoPath: () => 'reels-raw/owner-1/reel-1.mp4',
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
import EditReelClient from '@/components/reels/EditReelClient'

const REEL_QUERY_KEY = ['reels', 'edit', 'reel-1', 'owner-1']

const BASE_REEL = {
  id: 'reel-1',
  createdBy: 'owner-1',
  contact: '+24166000000',
  description: 'Ancienne légende',
  processingStatus: 'ready' as const,
  // Pas de videoUrl : l'effet de récupération vidéo (montage) ne se déclenche pas, on reste
  // sur le chemin "contact/description seuls" — le chemin de retrim (isTrimChanged) fait
  // l'objet d'une couverture séparée, hors budget de ce lot.
  videoUrl: undefined,
  thumbnailUrl: undefined,
}

function renderEditor(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <EditReelClient reelId="reel-1" />
    </QueryClientProvider>,
  )
}

async function submitWithNewDescription(client: QueryClient, newDescription = 'Nouvelle légende') {
  renderEditor(client)
  await screen.findByPlaceholderText('Ajouter une légende...')
  fireEvent.change(screen.getByPlaceholderText('Ajouter une légende...'), {
    target: { value: newDescription },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))
}

describe('EditReelClient — invalidations non bloquantes (point 7)', () => {
  let client: QueryClient
  let currentReel: typeof BASE_REEL

  beforeEach(() => {
    jest.clearAllMocks()
    currentReel = { ...BASE_REEL }
    // Stateful (comme un vrai backend) plutôt qu'un mock figé : l'invalidation lancée en
    // arrière-plan par le composant déclenche un vrai refetch React Query pendant le test,
    // qui doit retrouver la même valeur que celle déjà posée par setQueryData — sinon le test
    // se contredirait lui-même selon le timing du refetch.
    mockGetReelById.mockImplementation(async () => currentReel)
    mockUpdateReelDetails.mockImplementation(async (_id: string, contact: string, description: string) => {
      currentReel = { ...currentReel, contact, description }
    })
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it('affiche le toast et navigue sans attendre une invalidation pendante', async () => {
    jest.spyOn(client, 'invalidateQueries').mockReturnValue(new Promise(() => {}))

    await submitWithNewDescription(client)

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1))
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Réel modifié' }))
  })

  it('invalide toujours les trois clés (mes réels, détail, fil public)', async () => {
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    await submitWithNewDescription(client)

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1))
    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey)
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        ['reels-mine', 'owner-1'],
        REEL_QUERY_KEY,
        ['reels-feed'],
      ]),
    )
  })

  it('journalise un rejet d\'invalidation sans afficher de toast d\'échec', async () => {
    jest.spyOn(client, 'invalidateQueries').mockRejectedValue(new Error('invalidation failed'))

    await submitWithNewDescription(client)

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1))
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
  })

  it('une erreur API bloque toujours la navigation et affiche un toast destructif', async () => {
    mockUpdateReelDetails.mockRejectedValue(new Error('Firestore indisponible'))

    await submitWithNewDescription(client)

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('le cache détail contient le contact et la description mis à jour, sans attendre le refetch', async () => {
    await submitWithNewDescription(client, 'Nouvelle légende mise en cache')

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1))
    expect(client.getQueryData(REEL_QUERY_KEY)).toMatchObject({
      description: 'Nouvelle légende mise en cache',
    })
  })

  it('ne met pas le cache à jour si l\'écriture principale échoue', async () => {
    mockUpdateReelDetails.mockRejectedValue(new Error('Firestore indisponible'))

    await submitWithNewDescription(client, 'Ne devrait jamais apparaître')

    await waitFor(() => expect(mockToast).toHaveBeenCalled())
    expect(client.getQueryData(REEL_QUERY_KEY)).toMatchObject({
      description: BASE_REEL.description,
    })
  })

  it('le démontage juste après la navigation ne lève aucune erreur', async () => {
    const { unmount } = render(
      <QueryClientProvider client={client}>
        <EditReelClient reelId="reel-1" />
      </QueryClientProvider>,
    )
    await screen.findByPlaceholderText('Ajouter une légende...')
    fireEvent.change(screen.getByPlaceholderText('Ajouter une légende...'), {
      target: { value: 'Encore une légende' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1))
    expect(() => unmount()).not.toThrow()
  })
})
