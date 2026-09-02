import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const currentUserState: {
  user: Record<string, unknown> | null
  isFirebaseConnected: boolean
  error: string | null
} = {
  user: { uid: 'owner-1', roles: ['Announcer'], phoneNumbers: ['+24166545430'] },
  isFirebaseConnected: true,
  error: null,
}
const mockToast = jest.fn()
const mockCreateReel = jest.fn()
const mockUploadRawReelVideo = jest.fn()
const mockMarkReelUploadFailed = jest.fn()
const mockSubscribeToReel = jest.fn(() => jest.fn())
const mockClearDraftVideo = jest.fn()
const mockSaveDraftVideo = jest.fn()
const mockLoadDraftVideo = jest.fn()
let selectedFile: File
let returnTo = '/reels/mine'
let propertyId: string | null = null

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'propertyId' ? propertyId : returnTo),
  }),
}))

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => currentUserState,
}))

let propertyQueryData: Record<string, unknown> | undefined

jest.mock('@/hooks/use-property', () => ({
  useProperty: () => ({ data: propertyQueryData }),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

jest.mock('@/hooks/useReelDraftVideoStorage', () => ({
  useReelDraftVideoStorage: () => ({
    saveDraftVideo: mockSaveDraftVideo,
    loadDraftVideo: mockLoadDraftVideo,
    clearDraftVideo: mockClearDraftVideo,
  }),
}))

jest.mock('@/hooks/useVideoDropzone', () => ({
  useVideoDropzone: ({ onFile }: { onFile: (file: File, duration: number) => void }) => ({
    getRootProps: () => ({
      'data-testid': 'video-dropzone',
      onClick: () => onFile(selectedFile, 5),
    }),
    getInputProps: () => ({}),
    isDragActive: false,
    isProcessing: false,
  }),
}))

jest.mock('@/db/reel.db', () => ({
  buildRawReelVideoPath: (_file: File, ownerId: string, reelId: string) =>
    `reels-raw/${ownerId}/${reelId}.mov`,
  createReel: (...args: unknown[]) => mockCreateReel(...args),
  uploadRawReelVideo: (...args: unknown[]) => mockUploadRawReelVideo(...args),
  markReelUploadFailed: (...args: unknown[]) => mockMarkReelUploadFailed(...args),
  subscribeToReel: () => mockSubscribeToReel(),
}))

jest.mock('@/components/reels/VideoTrimEditor', () => ({
  VideoTrimEditor: () => <div data-testid="trim-editor" />,
}))

jest.mock('@/components/property-publish/PublishAuthModal', () => ({
  PublishAuthModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog" aria-label="Authentification requise">
        <button type="button" onClick={onClose}>Fermer</button>
      </div>
    ) : null,
}))

import CreateOrphanReelClient from '@/components/reels/CreateOrphanReelClient'

describe('CreateOrphanReelClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    currentUserState.user = {
      uid: 'owner-1',
      roles: ['Announcer'],
      phoneNumbers: ['+24166545430'],
    }
    currentUserState.isFirebaseConnected = true
    currentUserState.error = null
    returnTo = '/reels/mine'
    propertyId = null
    propertyQueryData = undefined
    selectedFile = new File(['video'], 'visite.mov', { type: 'video/quicktime' })
    mockLoadDraftVideo.mockResolvedValue(null)
    mockCreateReel.mockResolvedValue('reel-fixed-id')
    mockUploadRawReelVideo.mockResolvedValue('reels-raw/owner-1/reel-fixed-id.mov')
    mockMarkReelUploadFailed.mockResolvedValue(true)
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: jest.fn(() => 'reel-fixed-id'),
    })
  })

  async function chooseVideo() {
    fireEvent.click(screen.getByTestId('video-dropzone'))
    await waitFor(() => expect(screen.getByTestId('trim-editor')).toBeInTheDocument())
  }

  it('revient vers Mes reels quand returnTo est autorise', () => {
    render(<CreateOrphanReelClient />)
    expect(screen.getByRole('link', { name: /Retour/i })).toHaveAttribute('href', '/reels/mine')
  })

  it('ignore un returnTo externe et utilise la page publier', () => {
    returnTo = 'https://malicious.example'
    render(<CreateOrphanReelClient />)
    expect(screen.getByRole('link', { name: /Retour/i })).toHaveAttribute('href', '/publish')
  })

  it('ne cree et n upload le reel qu une fois apres un double clic', async () => {
    render(<CreateOrphanReelClient />)
    await chooseVideo()

    const publish = screen.getByRole('button', { name: 'Publier le réel' })
    fireEvent.click(publish)
    fireEvent.click(publish)

    await waitFor(() => expect(mockCreateReel).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockUploadRawReelVideo).toHaveBeenCalledTimes(1))
    expect(mockCreateReel).toHaveBeenCalledWith(
      'reel-fixed-id',
      null,
      'owner-1',
      'reels-raw/owner-1/reel-fixed-id.mov',
      '+24166545430',
      undefined,
      {},
      undefined,
    )
    expect(mockClearDraftVideo).toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Vidéo envoyée' }))
  })

  it('transmet la categorie choisie via le chip quand aucune annonce n est presselectionnee', async () => {
    // Demande directe d'un utilisateur : classer un réel qui ne sera jamais rattaché à une
    // annonce ne devrait pas être impossible — le chip Immobilier/Mode le fait directement.
    render(<CreateOrphanReelClient />)
    await chooseVideo()

    fireEvent.click(screen.getByRole('button', { name: 'Mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publier le réel' }))

    await waitFor(() => expect(mockCreateReel).toHaveBeenCalledWith(
      'reel-fixed-id',
      null,
      'owner-1',
      'reels-raw/owner-1/reel-fixed-id.mov',
      '+24166545430',
      undefined,
      {},
      'Mode',
    ))
  })

  it('desélectionne la categorie choisie via le chip en le recliquant', async () => {
    render(<CreateOrphanReelClient />)
    await chooseVideo()

    const modeChip = screen.getByRole('button', { name: 'Mode' })
    fireEvent.click(modeChip)
    expect(modeChip).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(modeChip)
    expect(modeChip).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Publier le réel' }))

    await waitFor(() => expect(mockCreateReel).toHaveBeenCalledWith(
      'reel-fixed-id',
      null,
      'owner-1',
      'reels-raw/owner-1/reel-fixed-id.mov',
      '+24166545430',
      undefined,
      {},
      undefined,
    ))
  })

  it('masque le chip de categorie quand une annonce est deja presselectionnee', async () => {
    // La catégorie est alors déjà déterminée par l'annonce rattachée (categoryPath copié
    // côté serveur) — laisser le chip visible pourrait faire croire qu'il change quelque chose.
    propertyId = 'property-1'
    propertyQueryData = { title: 'Studio Akébé', contact: '+24177001122', typeProperty: 'Studio' }
    render(<CreateOrphanReelClient />)
    await chooseVideo()

    expect(screen.queryByRole('button', { name: 'Mode' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Immobilier' })).not.toBeInTheDocument()
  })

  it('ouvre l authentification sans ecriture pour un visiteur', async () => {
    currentUserState.user = null
    render(<CreateOrphanReelClient />)
    await chooseVideo()

    fireEvent.click(screen.getByRole('button', { name: 'Publier le réel' }))

    expect(await screen.findByRole('dialog', { name: 'Authentification requise' })).toBeInTheDocument()
    expect(mockCreateReel).not.toHaveBeenCalled()
    expect(mockUploadRawReelVideo).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('propose un retour vers Mes annonces quand une annonce est preselectionnee', () => {
    // Arrivée depuis SelectPropertyForReelClient ou le bouton "Ajouter un réel" d'une annonce :
    // sans returnTo explicite, le retour naturel est la liste des annonces, pas "Publier".
    propertyId = 'property-1'
    returnTo = null as unknown as string
    render(<CreateOrphanReelClient />)
    expect(screen.getByRole('link', { name: /Retour/i })).toHaveAttribute('href', '/property')
  })

  it('affiche le titre de l annonce preselectionnee et preremplit son contact', async () => {
    propertyId = 'property-1'
    propertyQueryData = { title: 'Studio Akébé', contact: '+24177001122' }
    render(<CreateOrphanReelClient />)

    expect(screen.getByText(/Pour l'annonce « Studio Akébé »/)).toBeInTheDocument()

    await chooseVideo()
    fireEvent.click(screen.getByRole('button', { name: 'Publier le réel' }))

    await waitFor(() => expect(mockCreateReel).toHaveBeenCalledWith(
      'reel-fixed-id',
      'property-1',
      'owner-1',
      'reels-raw/owner-1/reel-fixed-id.mov',
      // Le contact de l'annonce prévaut sur le numéro de profil de l'annonceur.
      '+24177001122',
      undefined,
      {},
      undefined,
    ))
  })

  it('rattache le reel cree a l annonce preselectionnee sans contact', async () => {
    propertyId = 'property-2'
    propertyQueryData = { title: 'Villa Owendo' }
    render(<CreateOrphanReelClient />)
    await chooseVideo()

    fireEvent.click(screen.getByRole('button', { name: 'Publier le réel' }))

    await waitFor(() => expect(mockCreateReel).toHaveBeenCalledWith(
      'reel-fixed-id',
      'property-2',
      'owner-1',
      'reels-raw/owner-1/reel-fixed-id.mov',
      // Pas de contact sur l'annonce : repli sur le numéro de profil, comme sans annonce.
      '+24166545430',
      undefined,
      {},
      undefined,
    ))
  })

  it('marque le document en echec quand l upload Storage casse', async () => {
    mockUploadRawReelVideo.mockRejectedValue(new Error('Envoi annulé.'))
    render(<CreateOrphanReelClient />)
    await chooseVideo()

    fireEvent.click(screen.getByRole('button', { name: 'Publier le réel' }))

    await waitFor(() => expect(mockMarkReelUploadFailed).toHaveBeenCalledWith(
      'reel-fixed-id',
      'Envoi annulé.',
    ))
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Échec de l'envoi",
      variant: 'destructive',
    }))
  })

  it("prévient et débloque le bouton quand la connexion Firebase échoue, au lieu de tourner indéfiniment", async () => {
    // connectFirebaseClient (custom token NextAuth -> Firebase) peut échouer définitivement
    // sans jamais faire passer isFirebaseConnected à true — sans le correctif, le bouton
    // "Publier" restait bloqué en chargement pour toujours, sans aucun toast ni message.
    currentUserState.isFirebaseConnected = false
    currentUserState.error = 'Erreur de connexion Firebase'
    render(<CreateOrphanReelClient />)
    await chooseVideo()

    const publish = screen.getByRole('button', { name: 'Publier le réel' })
    fireEvent.click(publish)

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Échec de l'envoi",
      description: 'Erreur de connexion Firebase',
      variant: 'destructive',
    })))
    expect(mockCreateReel).not.toHaveBeenCalled()
    expect(mockUploadRawReelVideo).not.toHaveBeenCalled()
    // Le bouton redevient cliquable (isFinalSubmitting réinitialisé), pas bloqué en chargement.
    await waitFor(() => expect(publish).not.toBeDisabled())
  })
})
