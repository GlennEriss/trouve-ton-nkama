'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ImagePlus,
  Loader2,
  Megaphone,
  Trash2,
  Video,
  Wallet,
} from 'lucide-react'

import AdCreativeCard, { type AdCreativeCardData } from '@/components/ads/AdCreativeCard'
import AdCreativePreview from '@/components/ads/AdCreativePreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AD_PACKAGES } from '@/constantes/ad-packages'
import { formatsForPlacements, type AdFormat, type AdFormatKey } from '@/constantes/ad-formats'
import { routes } from '@/constantes/routes'
import { uploadAdCreativeImage } from '@/db/ad-image.db'
import { uploadAdCreativeVideo } from '@/db/ad-video.db'
import { useCreditPacks } from '@/hooks/use-credit-packs'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { useRecharge } from '@/providers/RechargeProvider'
import { AD_VIDEO_REJECTION_MESSAGES, validateAdVideoFile } from '@/lib/ads/validate-ad-video'
import {
  ADMIN_PACKS_TEMPLATE,
  estimateCreditsXafValue,
  formatCreditUnitPriceRange,
  formatXaf,
} from '@/lib/credits/credit-packs'
import { cn } from '@/lib/utils'
import type { AdPlacement } from '@/models/advertising'
import {
  hasAsset,
  PACKAGE_PLACEMENT_LABELS,
  type AssetMap,
} from './advertising-shared'

const REELS_FORMAT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm'
const IMAGE_ONLY_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
const REELS_TARGET_RATIO = 9 / 16
const REELS_RATIO_TOLERANCE = 0.08
const DEFAULT_CTA_LABEL = 'En savoir plus'
const ALLOWED_CTA_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'whatsapp:'])

const STEPS = [
  { id: 'package', title: 'Forfait', description: 'Choisissez où diffuser.' },
  { id: 'creative', title: 'Visuels', description: 'Ajoutez les formats.' },
  { id: 'message', title: 'Message', description: 'Préparez le CTA.' },
  { id: 'preview', title: 'Aperçu', description: 'Vérifiez et publiez.' },
] as const

const visualSkeleton = 'rounded bg-gray-200 dark:bg-gray-700'

type MediaDimensions = {
  width: number
  height: number
}

function normalizeCtaUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(https?:\/\/|mailto:|tel:|whatsapp:\/\/)/i.test(trimmed)) return trimmed
  if (/^(wa\.me|api\.whatsapp\.com|www\.)/i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

function isValidCtaUrl(value: string) {
  const normalized = normalizeCtaUrl(value)
  if (!normalized) return false

  try {
    const url = new URL(normalized)
    return ALLOWED_CTA_PROTOCOLS.has(url.protocol)
  } catch {
    return false
  }
}

function getCtaUrlError(value: string) {
  if (!value.trim()) return 'Ajoutez un lien au clic pour que la publicité puisse convertir.'
  if (!isValidCtaUrl(value)) return 'Lien invalide. Utilisez https://, wa.me, tel: ou mailto:.'
  return ''
}

function readImageDimensions(file: File): Promise<MediaDimensions | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      clearTimeout(timeoutId)
    }

    const finish = (dimensions: MediaDimensions | null) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(dimensions)
    }

    const timeoutId = setTimeout(() => finish(null), 8000)

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        finish(null)
        return
      }
      finish({ width: image.naturalWidth, height: image.naturalHeight })
    }

    image.onerror = () => {
      finish(null)
    }

    image.src = objectUrl
  })
}

function readVideoDimensions(file: File): Promise<MediaDimensions | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      clearTimeout(timeoutId)
      video.removeAttribute('src')
    }

    const finish = (dimensions: MediaDimensions | null) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(dimensions)
    }

    const timeoutId = setTimeout(() => finish(null), 8000)

    video.onloadedmetadata = () => {
      if (!video.videoWidth || !video.videoHeight) {
        finish(null)
        return
      }
      finish({ width: video.videoWidth, height: video.videoHeight })
    }

    video.onerror = () => {
      finish(null)
    }

    video.preload = 'metadata'
    video.src = objectUrl
  })
}

async function readMediaDimensions(file: File): Promise<MediaDimensions | null> {
  if (file.type.startsWith('image/')) return readImageDimensions(file)
  if (file.type.startsWith('video/')) return readVideoDimensions(file)
  return null
}

function buildReelsRatioWarning(dimensions: MediaDimensions | null) {
  if (!dimensions) return ''

  const ratio = dimensions.width / dimensions.height
  const isVertical = dimensions.height > dimensions.width
  const isNearReelsRatio = Math.abs(ratio - REELS_TARGET_RATIO) <= REELS_RATIO_TOLERANCE

  if (isVertical && isNearReelsRatio) return ''

  return `Format vertical recommandé pour Réels (1080×1920). Votre fichier ${dimensions.width}×${dimensions.height} sera affiché avec des bandes noires.`
}

function GhostPropertyCard() {
  return (
    <div className="space-y-1.5">
      <div className={cn('aspect-[4/3] w-full', visualSkeleton)} />
      <div className={cn('h-2 w-3/4', visualSkeleton)} />
      <div className={cn('h-2 w-1/2', visualSkeleton)} />
    </div>
  )
}

function GhostPropertyGrid({ cols = 2 }: { cols?: 2 | 3 }) {
  return (
    <div className={cn('grid gap-2', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {Array.from({ length: cols }).map((_, index) => (
        <GhostPropertyCard key={index} />
      ))}
    </div>
  )
}

function PlacementMockup({
  placement,
  children,
}: {
  placement: AdPlacement
  children: React.ReactNode
}) {
  if (placement === 'search_infeed' || placement === 'immobilier_infeed') {
    return (
      <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-gray-900">
        <div className="space-y-3">
          <div className="hidden sm:block">
            <GhostPropertyGrid cols={2} />
          </div>
          {children}
          <GhostPropertyGrid cols={2} />
        </div>
      </div>
    )
  }

  if (placement === 'property_detail') {
    return (
      <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-gray-900">
        <div className="space-y-3">
          <div className={cn('aspect-[16/9] w-full', visualSkeleton)} />
          <div className={cn('h-3 w-2/3', visualSkeleton)} />
          <div className={cn('h-2 w-1/2', visualSkeleton)} />
          {children}
          <div className={cn('h-2 w-1/3', visualSkeleton)} />
          <GhostPropertyGrid cols={2} />
        </div>
      </div>
    )
  }

  if (placement === 'reels_infeed') {
    return (
      <div className="flex justify-center">
        <div className="relative aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-2xl bg-neutral-950 shadow-sm">
          <p className="absolute left-4 top-4 z-20 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur-sm">
            Publicité
          </p>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-gray-900">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn('h-7 w-7 rounded-full', visualSkeleton)} />
          <div className="flex flex-1 items-center rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800">
            <div className={cn('h-2 w-1/3', visualSkeleton)} />
          </div>
        </div>
        {children}
        <GhostPropertyGrid cols={2} />
      </div>
    </div>
  )
}

function CreativeUploadSlot({
  format,
  placement,
  asset,
  creative,
  uploading,
  onUpload,
}: {
  format: AdFormat
  placement: AdPlacement
  asset?: AssetMap[AdPlacement]
  creative: AdCreativeCardData
  uploading: boolean
  onUpload: (file: File) => void
}) {
  const inputId = React.useId()
  const shownCreative: AdCreativeCardData = {
    ...creative,
    imageURL: asset?.imageURL || creative.imageURL,
    videoURL: asset?.videoURL || creative.videoURL,
  }
  const hasVisual = Boolean(shownCreative.imageURL || shownCreative.videoURL)

  const card =
    placement === 'home' ? (
      <div className="aspect-[3/1] w-full overflow-hidden rounded-xl bg-gradient-to-r from-sky to-peach">
        <AdCreativeCard
          creative={shownCreative}
          placement="home"
          surface="none"
          fillHeight
          interactive={false}
          className="h-full w-full [&_a]:h-full"
        />
      </div>
    ) : placement === 'reels_infeed' ? (
      <AdCreativeCard
        creative={shownCreative}
        placement="reels_infeed"
        reelFullscreen
        interactive={false}
      />
    ) : (
      <AdCreativeCard
        creative={shownCreative}
        placement={placement}
        surface={placement === 'search_infeed' || placement === 'immobilier_infeed' ? 'card' : 'none'}
        interactive={false}
      />
    )

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'group relative block cursor-pointer overflow-hidden rounded-xl ring-2 ring-dashed ring-secondary/45 transition hover:ring-secondary focus-within:ring-secondary',
        placement === 'reels_infeed' && 'h-full w-full',
      )}
    >
      <input
        id={inputId}
        type="file"
        accept={format.key === 'reels' ? REELS_FORMAT_ACCEPT : IMAGE_ONLY_ACCEPT}
        disabled={uploading}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onUpload(file)
        }}
      />
      <div className={cn(placement === 'reels_infeed' && 'h-full w-full')}>
        {card}
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 p-4 text-center transition group-hover:bg-black/10',
          !hasVisual && 'bg-secondary/10',
        )}
      >
        <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-lg shadow-black/10 dark:bg-gray-950 dark:text-white">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-secondary" />
          ) : (
            <ImagePlus className="h-4 w-4 text-secondary" />
          )}
          {uploading ? 'Import en cours' : hasVisual ? 'Changer le visuel' : 'Ajouter le visuel'}
        </span>
      </div>
    </label>
  )
}

function Stepper({
  currentStep,
}: {
  currentStep: number
}) {
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((step, index) => {
        const isActive = index === currentStep
        const isDone = index < currentStep
        return (
          <li
            key={step.id}
            className={cn(
              'rounded-xl border px-2 py-2 transition sm:p-3',
              isActive
                ? 'border-secondary bg-secondary/5 text-ink'
                : isDone
                  ? 'border-secondary/30 bg-white text-ink'
                  : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900',
            )}
            aria-current={isActive ? 'step' : undefined}
          >
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isDone || isActive ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800',
                )}
              >
                {isDone ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </span>
              <span className="max-w-full truncate text-[11px] font-semibold leading-tight sm:text-base">{step.title}</span>
            </div>
            <p className="mt-2 hidden text-xs text-gray-500 sm:block">{step.description}</p>
          </li>
        )
      })}
    </ol>
  )
}

export default function AdvertisingCreateWizard() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()
  const { toast } = useToast()
  const { openRecharge } = useRecharge()
  const creditPacksQuery = useCreditPacks()
  const publishIdempotencyKeyRef = React.useRef<string | null>(null)
  const isPublishingRef = React.useRef(false)

  const credits = Number(user?.credits ?? 0)
  const creditPacks = creditPacksQuery.data?.packs?.length ? creditPacksQuery.data.packs : ADMIN_PACKS_TEMPLATE

  const [currentStep, setCurrentStep] = React.useState(0)
  const [packageId, setPackageId] = React.useState('brand')
  const [imageURL, setImageURL] = React.useState('')
  const [imagePATH, setImagePATH] = React.useState('')
  const [localPreview, setLocalPreview] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const [headline, setHeadline] = React.useState('')
  const [body, setBody] = React.useState('')
  const [ctaLabel, setCtaLabel] = React.useState('')
  const [ctaUrl, setCtaUrl] = React.useState('')
  const [assets, setAssets] = React.useState<AssetMap>({})
  const [formatWarnings, setFormatWarnings] = React.useState<Partial<Record<AdFormatKey, string>>>({})
  const [defaultVisualReelsWarning, setDefaultVisualReelsWarning] = React.useState('')
  const [formatUploading, setFormatUploading] = React.useState<AdFormat['key'] | null>(null)
  const [activeFormatKey, setActiveFormatKey] = React.useState<AdFormat['key']>('infeed')

  React.useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const selectedPackage = AD_PACKAGES.find((p) => p.id === packageId)
  const formats = selectedPackage ? formatsForPlacements(selectedPackage.placements) : []
  const hasReelsPlacement = selectedPackage?.placements.includes('reels_infeed') ?? false
  const hasVisualForPlacement = (placement: AdPlacement) => Boolean(imageURL || hasAsset(assets[placement]))
  const hasAllPlacementVisuals = selectedPackage ? selectedPackage.placements.every(hasVisualForPlacement) : false
  const normalizedCtaUrl = normalizeCtaUrl(ctaUrl)
  const ctaUrlError = getCtaUrlError(ctaUrl)
  const hasValidCtaUrl = isValidCtaUrl(ctaUrl)
  const effectiveCtaLabel = ctaLabel.trim() || DEFAULT_CTA_LABEL
  const activeFormat =
    formats.find((format) => format.key === activeFormatKey) ??
    formats.find((format) => format.key === 'infeed') ??
    formats[0]
  const activePlacement = activeFormat?.placements[0]
  const activeAsset = activeFormat?.placements.map((placement) => assets[placement]).find(Boolean)
  const totalPlacementCount = selectedPackage?.placements.length ?? 0
  const readyPlacementCount = selectedPackage?.placements.filter(hasVisualForPlacement).length ?? 0
  const visualProgress = totalPlacementCount ? Math.round((readyPlacementCount / totalPlacementCount) * 100) : 0
  const stepProgress = Math.round(((currentStep + 1) / STEPS.length) * 100)
  const selectedPackageXafValue = selectedPackage
    ? estimateCreditsXafValue(selectedPackage.credits, creditPacks)
    : 0
  const creditUnitPriceLabel = formatCreditUnitPriceRange(creditPacks)
  const reelsFormatWarning =
    formatWarnings.reels ||
    (hasReelsPlacement && !hasAsset(assets.reels_infeed) ? defaultVisualReelsWarning : '')

  const setFormatWarning = (formatKey: AdFormatKey, warning: string) => {
    setFormatWarnings((prev) => {
      const next = { ...prev }
      if (warning) next[formatKey] = warning
      else delete next[formatKey]
      return next
    })
  }

  React.useEffect(() => {
    if (formats.length === 0) return
    if (formats.some((format) => format.key === activeFormatKey)) return
    setActiveFormatKey(formats.find((format) => format.key === 'infeed')?.key ?? formats[0].key)
  }, [activeFormatKey, formats])

  const handleUpload = async (file: File) => {
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setImageURL('')
    setImagePATH('')
    setUploading(true)
    try {
      setDefaultVisualReelsWarning(buildReelsRatioWarning(await readMediaDimensions(file)))
      if (!user?.uid) throw new Error('Connecte-toi pour uploader une image.')
      const data = await uploadAdCreativeImage(file, user.uid)
      setImageURL(data.imageURL)
      setImagePATH(data.imagePATH)
    } catch (e) {
      toast({ title: 'Upload impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const clearDefaultVisual = () => {
    setImageURL('')
    setImagePATH('')
    setDefaultVisualReelsWarning('')
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }

  const handleFormatUpload = async (format: AdFormat, file: File) => {
    setFormatUploading(format.key)
    try {
      if (format.key === 'reels') {
        setFormatWarning(format.key, buildReelsRatioWarning(await readMediaDimensions(file)))
      } else {
        setFormatWarning(format.key, '')
      }

      if (format.key === 'reels' && file.type.startsWith('video/')) {
        if (!user?.uid) throw new Error('Connecte-toi pour uploader une vidéo.')
        const validation = await validateAdVideoFile(file)
        if (!validation.ok) {
          throw new Error(AD_VIDEO_REJECTION_MESSAGES[validation.reason!])
        }
        const data = await uploadAdCreativeVideo(file, user.uid)
        setAssets((prev) => {
          const next = { ...prev }
          for (const p of format.placements) next[p] = { videoURL: data.videoURL, videoPATH: data.videoPATH }
          return next
        })
        return
      }

      if (!user?.uid) throw new Error('Connecte-toi pour uploader une image.')
      const data = await uploadAdCreativeImage(file, user.uid)
      setAssets((prev) => {
        const next = { ...prev }
        for (const p of format.placements) next[p] = data
        return next
      })
    } catch (e) {
      toast({ title: 'Upload impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setFormatUploading(null)
    }
  }

  const clearFormat = (format: AdFormat) => {
    setFormatWarning(format.key, '')
    setAssets((prev) => {
      const next = { ...prev }
      for (const p of format.placements) delete next[p]
      return next
    })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!publishIdempotencyKeyRef.current) {
        publishIdempotencyKeyRef.current =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `ad-${Date.now()}-${Math.random().toString(36).slice(2)}`
      }
      const res = await fetch('/api/advertising/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': publishIdempotencyKeyRef.current,
        },
        body: JSON.stringify({
          idempotencyKey: publishIdempotencyKeyRef.current,
          packageId,
          creative: {
            imageURL,
            imagePATH,
            assets: Object.keys(assets).length ? assets : undefined,
            headline: headline || undefined,
            body: body || undefined,
            ctaLabel: effectiveCtaLabel,
            ctaUrl: normalizedCtaUrl,
          },
        }),
      })
      const payload = await res.json()
      if (res.status === 402) {
        const err = new Error(payload.message || 'Crédits insuffisants.')
        err.name = 'INSUFFICIENT_CREDITS'
        throw err
      }
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Échec de la création.')
      return payload
    },
    onSuccess: () => {
      publishIdempotencyKeyRef.current = null
      toast({ title: 'Publicité en ligne', description: 'Votre campagne est désormais diffusée.', variant: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['my-ad-campaigns'] })
      router.push(routes.protected.advertising)
    },
    onError: (e: any) => {
      isPublishingRef.current = false
      if (e?.name === 'INSUFFICIENT_CREDITS') {
        toast({ title: 'Crédits insuffisants', description: 'Rechargez pour publier votre pub.', variant: 'destructive' })
        openRecharge()
        return
      }
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    },
  })

  const canPublish =
    !!selectedPackage &&
    hasAllPlacementVisuals &&
    hasValidCtaUrl &&
    !uploading &&
    !formatUploading &&
    !createMutation.isPending

  const canGoNext =
    currentStep === 0
      ? !!selectedPackage
      : currentStep === 1
        ? hasAllPlacementVisuals && !uploading && !formatUploading
        : currentStep === 2
          ? hasValidCtaUrl
          : canPublish

  const goNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((step) => step + 1)
  }

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((step) => step - 1)
  }

  const publishCampaign = () => {
    if (!canPublish || isPublishingRef.current) return
    isPublishingRef.current = true
    createMutation.mutate()
  }

  const selectedCreative = {
    imageURL: imageURL || localPreview || undefined,
    headline: headline || undefined,
    body: body || undefined,
    ctaLabel: effectiveCtaLabel,
    ctaUrl: normalizedCtaUrl || undefined,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 pb-32 pt-8 md:pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={routes.protected.advertising}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gray-600 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Publicités
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink dark:text-white">Créer une publicité</h1>
              <p className="text-sm text-gray-500">Construisez la campagne étape par étape.</p>
            </div>
          </div>
        </div>
        <div className="flex min-h-10 flex-col justify-center gap-0.5 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:items-end">
          <span className="inline-flex items-center gap-2 font-semibold">
            <Wallet className="h-4 w-4 text-secondary" />
            {credits.toLocaleString('fr-FR')} crédits
          </span>
          <span className="text-xs text-gray-500">{creditUnitPriceLabel}</span>
        </div>
      </header>

      <Stepper currentStep={currentStep} />

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
        {currentStep === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-ink dark:text-white">Choisir un forfait</h2>
              <p className="mt-1 text-sm text-gray-500">Le forfait définit les emplacements et la durée de diffusion.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {AD_PACKAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPackageId(p.id)}
                  className={cn(
                    'min-h-44 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary',
                    packageId === p.id
                      ? 'border-secondary bg-secondary/5 ring-2 ring-secondary/20'
                      : 'border-gray-200 hover:border-secondary/50 dark:border-gray-700',
                  )}
                >
                  <p className="font-semibold text-ink dark:text-white">{p.name}</p>
                  <p className="mt-1 text-2xl font-bold text-primary dark:text-primary-200">{p.credits} crédits</p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    ≈ {formatXaf(estimateCreditsXafValue(p.credits, creditPacks))}
                  </p>
                  <p className="mt-2 min-h-10 text-xs leading-5 text-gray-500">{p.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.placements.map((placement) => (
                      <span
                        key={placement}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          placement === 'reels_infeed'
                            ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-primary-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
                        )}
                      >
                        {PACKAGE_PLACEMENT_LABELS[placement]}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-ink dark:text-white">Ajouter les visuels</h2>
              <p className="text-sm leading-6 text-gray-500">Choisissez le format, puis touchez la zone pub pour importer le visuel.</p>
            </div>

            <div className="rounded-2xl border border-secondary/20 bg-primary-50 p-3 dark:border-secondary/30 dark:bg-primary-950 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink dark:text-white">
                  {readyPlacementCount}/{totalPlacementCount} emplacements prêts
                </p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 dark:bg-gray-950 dark:text-primary-200">
                  {visualProgress}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-secondary/10 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-secondary transition-all duration-300"
                  style={{ width: `${visualProgress}%` }}
                />
              </div>
              <div className="-mx-3 mt-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
                <div className="flex min-w-max gap-2 lg:grid lg:min-w-0 lg:grid-cols-4" role="tablist" aria-label="Formats publicitaires">
                  {formats.map((fmt) => {
                    const ready = fmt.placements.every(hasVisualForPlacement)
                    const dedicated = fmt.placements.every((placement) => hasAsset(assets[placement]))
                    const warning = fmt.key === 'reels' ? reelsFormatWarning : formatWarnings[fmt.key]
                    return (
                      <button
                        key={fmt.key}
                        type="button"
                        role="tab"
                        aria-selected={activeFormat?.key === fmt.key}
                        onClick={() => setActiveFormatKey(fmt.key)}
                        className={cn(
                          'min-h-[58px] w-[11.5rem] shrink-0 touch-manipulation rounded-2xl border bg-white px-3 py-2 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary lg:w-auto',
                          activeFormat?.key === fmt.key
                            ? 'border-secondary shadow-sm ring-2 ring-secondary/15'
                            : 'border-transparent ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-2.5 w-2.5 rounded-full',
                              warning ? 'bg-amber-500' : ready ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-600',
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink dark:text-white">
                            {fmt.label}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {warning ? 'Format à vérifier' : dedicated ? 'Visuel dédié' : ready ? 'Visuel par défaut' : fmt.recommended}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-w-0 rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/40 sm:p-4">
                {activeFormat && activePlacement ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-1">
                      <div>
                        <h3 className="text-base font-semibold text-ink dark:text-white">{activeFormat.label}</h3>
                        <p className="mt-1 text-sm leading-5 text-gray-500">
                          {activeFormat.ratioHint} · {activeFormat.recommended}
                          {activeFormat.key === 'reels' ? ' · image ou vidéo jusqu’à 5 min' : ''}
                        </p>
                      </div>
                      {activeFormat.placements.every((placement) => hasAsset(assets[placement])) ? (
                        <button
                          type="button"
                          onClick={() => clearFormat(activeFormat)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Retirer
                        </button>
                      ) : null}
                    </div>

                    <PlacementMockup placement={activePlacement}>
                      <CreativeUploadSlot
                        format={activeFormat}
                        placement={activePlacement}
                        asset={activeAsset}
                        creative={selectedCreative}
                        uploading={formatUploading === activeFormat.key}
                        onUpload={(file) => void handleFormatUpload(activeFormat, file)}
                      />
                    </PlacementMockup>

                    {activeFormat.key === 'reels' && reelsFormatWarning ? (
                      <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{reelsFormatWarning}</p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-1.5 px-1">
                      {activeFormat.placements.map((placement) => (
                        <span
                          key={placement}
                          className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700"
                        >
                          {PACKAGE_PLACEMENT_LABELS[placement]}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label htmlFor="default-ad-image" className="text-sm font-semibold">Visuel par défaut</Label>
                      <p className="mt-1 text-xs leading-5 text-gray-500">Couvre les emplacements sans visuel dédié.</p>
                    </div>
                    {(imageURL || localPreview) ? (
                      <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-50 ring-1 ring-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageURL || localPreview} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                  </div>
                  <input
                    id="default-ad-image"
                    type="file"
                    accept={IMAGE_ONLY_ACCEPT}
                    disabled={uploading}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file) void handleUpload(file)
                    }}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label
                      htmlFor="default-ad-image"
                      className="inline-flex min-h-11 flex-1 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white shadow-sm transition active:scale-[0.98]"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      {uploading ? 'Import' : (imageURL || localPreview) ? 'Changer' : 'Importer'}
                    </label>
                    {(imageURL || localPreview) ? (
                      <button
                        type="button"
                        onClick={clearDefaultVisual}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Retirer
                      </button>
                    ) : null}
                  </div>
                  {hasReelsPlacement && !hasAsset(assets.reels_infeed) && defaultVisualReelsWarning ? (
                    <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{defaultVisualReelsWarning}</p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
                    <ImagePlus className="h-4 w-4 text-secondary" />
                    Progression visuelle
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedPackage?.placements.map((placement) => (
                      <div key={placement} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-600 dark:text-gray-300">{PACKAGE_PLACEMENT_LABELS[placement]}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', hasVisualForPlacement(placement) ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-primary-200' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                          {placement === 'reels_infeed' && hasVisualForPlacement(placement) && reelsFormatWarning
                            ? 'À vérifier'
                            : hasVisualForPlacement(placement) ? 'Prêt' : 'Manquant'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {!hasAllPlacementVisuals ? (
                    <p className="mt-4 text-xs leading-5 text-red-600">
                      Ajoutez un visuel par défaut ou un visuel dédié pour chaque emplacement du forfait.
                    </p>
                  ) : null}
                </div>
              </aside>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-ink dark:text-white">Préparer le message</h2>
              <p className="mt-1 text-sm text-gray-500">Le lien au clic est obligatoire pour transformer les vues en contacts.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ad-headline">Accroche</Label>
                <Input
                  id="ad-headline"
                  placeholder="Ex: Chambre moderne à visiter aujourd’hui"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-cta">Texte du bouton</Label>
                <Input
                  id="ad-cta"
                  placeholder="Ex: Appeler, WhatsApp, Voir"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                />
                <p className="text-xs leading-5 text-gray-500">Par défaut : {DEFAULT_CTA_LABEL}.</p>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="ad-body">Description courte</Label>
                <Textarea
                  id="ad-body"
                  placeholder="Une phrase claire pour donner envie de cliquer."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="ad-url">Lien au clic <span className="text-red-600">*</span></Label>
                <Input
                  id="ad-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  required
                  aria-invalid={Boolean(ctaUrlError)}
                  aria-describedby="ad-url-helper"
                  placeholder="https://... ou wa.me/241..."
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  onBlur={() => setCtaUrl(normalizeCtaUrl(ctaUrl))}
                />
                <p
                  id="ad-url-helper"
                  className={cn(
                    'text-sm leading-5',
                    ctaUrlError ? 'text-red-600' : 'text-gray-500',
                  )}
                >
                  {ctaUrlError || 'Ce lien sera ouvert quand un utilisateur touche la publicité.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-white">Vérifier avant publication</h2>
                <p className="mt-1 text-sm text-gray-500">Contrôlez les emplacements, les visuels et le coût final.</p>
              </div>
              <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary dark:bg-secondary/15 dark:text-primary-200">
                <span className="font-semibold">{selectedPackage?.name}</span>
                <span className="mx-2">·</span>
                <span>{selectedPackage?.credits} crédits</span>
                <span className="mx-2">·</span>
                <span>≈ {formatXaf(selectedPackageXafValue)}</span>
              </div>
            </div>

            {!hasValidCtaUrl ? (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{ctaUrlError}</p>
              </div>
            ) : null}

            {reelsFormatWarning ? (
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{reelsFormatWarning}</p>
              </div>
            ) : null}

            <AdCreativePreview
              creative={selectedCreative}
              assets={assets}
              placements={selectedPackage?.placements ?? []}
            />

            {hasReelsPlacement ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
                  <Video className="h-4 w-4 text-secondary" />
                  Aperçu visuel dans les réels
                </div>
                <AdCreativePreview
                  creative={selectedCreative}
                  assets={assets}
                  placements={['reels_infeed']}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>

      <div className="-mx-1 mb-[calc(6rem+env(safe-area-inset-bottom,0px))] rounded-2xl border border-gray-200 bg-white px-3 pb-2 pt-2 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:hidden">
        <div className="mx-auto max-w-md">
          <div
            className="mb-2 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            role="progressbar"
            aria-label="Progression de la création de publicité"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={currentStep + 1}
            aria-valuetext={`Étape ${currentStep + 1} sur ${STEPS.length}`}
          >
            <div
              className="h-full rounded-full bg-secondary transition-all duration-300"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={currentStep === 0 || createMutation.isPending}
              aria-label="Retour à l’étape précédente"
              className="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-full border border-gray-200 bg-white text-ink transition active:scale-95 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                aria-label={`Continuer vers l’étape ${currentStep + 2}`}
                className="flex h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-800 active:scale-[0.98] disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none dark:disabled:bg-gray-700 dark:disabled:text-gray-300"
              >
                Continuer
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={publishCampaign}
                disabled={!canPublish}
                aria-label={`Payer ${selectedPackage?.credits ?? ''} crédits, environ ${formatXaf(selectedPackageXafValue)}, et publier`}
                className="flex h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-800 active:scale-[0.98] disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none dark:disabled:bg-gray-700 dark:disabled:text-gray-300"
              >
                {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                Payer & publier
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="hidden gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:flex sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0 || createMutation.isPending}
          className="min-h-11"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {selectedPackage && (
            <p className="text-sm text-gray-500">
              {selectedPackage.name} · {selectedPackage.credits} crédits ≈ {formatXaf(selectedPackageXafValue)} · {selectedPackage.durationDays} j
            </p>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="min-h-11 bg-primary hover:bg-primary-800"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={publishCampaign}
              disabled={!canPublish}
              className="min-h-11 bg-primary hover:bg-primary-800"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Payer {selectedPackage?.credits} crédits & publier
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
