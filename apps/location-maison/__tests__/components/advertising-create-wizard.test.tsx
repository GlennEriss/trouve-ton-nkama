import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import AdvertisingCreateWizard from '@/components/advertising/AdvertisingCreateWizard'

const pushMock = jest.fn()
const toastMock = jest.fn()
const openRechargeMock = jest.fn()
const invalidateQueriesMock = jest.fn()
const uploadImageMock = jest.fn()
const uploadVideoMock = jest.fn()
const validateVideoMock = jest.fn()

let currentUser: { uid: string; credits: number } | null

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
  useMutation: (options: {
    mutationFn: () => Promise<unknown>
    onSuccess: (payload: unknown) => void
    onError: (error: unknown) => void
  }) => ({
    isPending: false,
    mutate: () => {
      void options.mutationFn().then(options.onSuccess).catch(options.onError)
    },
  }),
}))

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: currentUser }),
}))

jest.mock('@/hooks/use-credit-packs', () => ({
  useCreditPacks: () => ({ data: { packs: [] } }),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

jest.mock('@/providers/RechargeProvider', () => ({
  useRecharge: () => ({ openRecharge: openRechargeMock }),
}))

jest.mock('@/db/ad-image.db', () => ({
  uploadAdCreativeImage: (...args: unknown[]) => uploadImageMock(...args),
}))

jest.mock('@/db/ad-video.db', () => ({
  uploadAdCreativeVideo: (...args: unknown[]) => uploadVideoMock(...args),
}))

jest.mock('@/lib/ads/validate-ad-video', () => ({
  AD_VIDEO_REJECTION_MESSAGES: { duration: 'Vidéo trop longue.' },
  validateAdVideoFile: (...args: unknown[]) => validateVideoMock(...args),
}))

jest.mock('@/components/ads/AdCreativeCard', () => ({
  __esModule: true,
  default: ({ creative, placement }: { creative: { headline?: string }; placement: string }) => (
    <div data-testid={`creative-${placement}`}>{creative.headline ?? 'Aperçu sans titre'}</div>
  ),
}))

jest.mock('@/components/ads/AdCreativePreview', () => ({
  __esModule: true,
  default: ({ placements }: { placements: string[] }) => (
    <div data-testid="creative-preview">{placements.join(',')}</div>
  ),
}))

const fetchMock = jest.fn()

function installMediaDimensions(width = 1200, height = 400) {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: jest.fn(() => 'blob:advertising-preview'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: jest.fn(),
  })

  class LoadedImage {
    naturalWidth = width
    naturalHeight = height
    onload: null | (() => void) = null
    onerror: null | (() => void) = null

    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }

  Object.defineProperty(global, 'Image', {
    configurable: true,
    value: LoadedImage,
  })
}

async function uploadDefaultImage() {
  const input = document.querySelector<HTMLInputElement>('#default-ad-image')
  expect(input).not.toBeNull()
  fireEvent.change(input!, {
    target: { files: [new File(['image'], 'campagne.jpg', { type: 'image/jpeg' })] },
  })
  await waitFor(() => expect(uploadImageMock).toHaveBeenCalled())
}

async function reachMessageStep() {
  fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
  expect(screen.getByRole('heading', { name: /Ajouter les visuels/i })).toBeVisible()
  await uploadDefaultImage()
  await waitFor(() => expect(screen.getByText('5/5 emplacements prêts')).toBeVisible())
  fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
  expect(screen.getByRole('heading', { name: /Préparer le message/i })).toBeVisible()
}

async function reachPreviewStep(ctaUrl = 'wa.me/24166545430') {
  await reachMessageStep()
  fireEvent.change(screen.getByLabelText('Accroche'), { target: { value: 'Maison à visiter' } })
  fireEvent.change(screen.getByLabelText('Description courte'), { target: { value: 'Disponible maintenant.' } })
  fireEvent.change(screen.getByLabelText(/Lien au clic/i), { target: { value: ctaUrl } })
  fireEvent.blur(screen.getByLabelText(/Lien au clic/i))
  fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
  expect(screen.getByRole('heading', { name: /Vérifier avant publication/i })).toBeVisible()
}

describe('AdvertisingCreateWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    currentUser = { uid: 'announcer-9b', credits: 169 }
    installMediaDimensions()
    uploadImageMock.mockResolvedValue({
      imageURL: 'https://example.com/campagne.jpg',
      imagePATH: 'advertising/announcer-9b/campagne.jpg',
    })
    uploadVideoMock.mockResolvedValue({
      videoURL: 'https://example.com/campagne.mp4',
      videoPATH: 'advertising/announcer-9b/campagne.mp4',
    })
    validateVideoMock.mockResolvedValue({ ok: true })
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, campaignId: 'campaign-9b' }),
    })
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock })
  })

  it('traverse les quatre étapes, normalise le CTA et publie une seule campagne', async () => {
    render(<AdvertisingCreateWizard />)

    expect(screen.getByRole('heading', { name: 'Créer une publicité' })).toBeVisible()
    expect(screen.getByText('169 crédits')).toBeVisible()
    await reachPreviewStep()

    expect(screen.getAllByText(/Format vertical recommandé pour Réels/i).length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('creative-preview')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: /Payer 70 crédits & publier/i }))
    fireEvent.click(screen.getByRole('button', { name: /Payer 70 crédits & publier/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [, request] = fetchMock.mock.calls[0]
    const payload = JSON.parse(String(request.body))
    expect(request.headers['Idempotency-Key']).toEqual(expect.any(String))
    expect(payload).toEqual(expect.objectContaining({
      packageId: 'brand',
      creative: expect.objectContaining({
        ctaUrl: 'https://wa.me/24166545430',
        ctaLabel: 'En savoir plus',
        headline: 'Maison à visiter',
      }),
    }))
    await waitFor(() => {
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['my-ad-campaigns'] })
      expect(pushMock).toHaveBeenCalled()
    })
  })

  it('bloque un lien invalide et permet de retirer le visuel par défaut', async () => {
    render(<AdvertisingCreateWizard />)
    await reachMessageStep()

    fireEvent.change(screen.getByLabelText(/Lien au clic/i), { target: { value: 'javascript:alert(1)' } })
    expect(screen.getByText(/Lien invalide/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /Suivant/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /^Retour$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }))
    expect(screen.getByText('0/5 emplacements prêts')).toBeVisible()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('ouvre la recharge lorsque l API refuse la campagne pour crédits insuffisants', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ success: false, message: 'Solde insuffisant.' }),
    })
    render(<AdvertisingCreateWizard />)
    await reachPreviewStep('https://songo-game.com/download')

    fireEvent.click(screen.getByRole('button', { name: /Payer 70 crédits & publier/i }))

    await waitFor(() => expect(openRechargeMock).toHaveBeenCalledTimes(1))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Crédits insuffisants',
      variant: 'destructive',
    }))
  })

  it('signale un upload sans session et conserve le forfait Réels sélectionné', async () => {
    currentUser = null
    render(<AdvertisingCreateWizard />)
    fireEvent.click(screen.getByRole('button', { name: /^Réels 45 crédits/i }))
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))

    const input = document.querySelector<HTMLInputElement>('#default-ad-image')
    expect(input).not.toBeNull()
    fireEvent.change(input!, {
      target: { files: [new File(['image'], 'campagne.jpg', { type: 'image/jpeg' })] },
    })

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Upload impossible',
      description: 'Connecte-toi pour uploader une image.',
    })))
    expect(screen.getByText('0/1 emplacements prêts')).toBeVisible()
  })
})
