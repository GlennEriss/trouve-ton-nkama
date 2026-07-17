'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
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
import { formatsForPlacements, type AdFormat } from '@/constantes/ad-formats'
import { routes } from '@/constantes/routes'
import { uploadAdCreativeVideo } from '@/db/ad-video.db'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { useRecharge } from '@/providers/RechargeProvider'
import { AD_VIDEO_REJECTION_MESSAGES, validateAdVideoFile } from '@/lib/ads/validate-ad-video'
import { cn } from '@/lib/utils'
import type { AdPlacement } from '@/models/advertising'
import {
  hasAsset,
  PACKAGE_PLACEMENT_LABELS,
  type AssetMap,
} from './advertising-shared'

const REELS_FORMAT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm'
const IMAGE_ONLY_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

const STEPS = [
  { id: 'package', title: 'Forfait', description: 'Choisissez où diffuser.' },
  { id: 'creative', title: 'Visuels', description: 'Ajoutez les formats.' },
  { id: 'message', title: 'Message', description: 'Préparez le CTA.' },
  { id: 'preview', title: 'Aperçu', description: 'Vérifiez et publiez.' },
] as const

async function uploadAdImage(file: File): Promise<{ imageURL: string; imagePATH: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/advertising/upload', { method: 'POST', body: fd })
  const payload = await res.json()
  if (!res.ok || !payload.success) throw new Error(payload?.error?.message || 'Échec de l’upload.')
  return { imageURL: payload.imageURL as string, imagePATH: payload.imagePATH as string }
}

function FormatAssetPreview({
  asset,
}: {
  asset?: AssetMap[AdPlacement]
}) {
  if (!asset) return null

  return (
    <div className="h-16 w-12 overflow-hidden rounded-lg bg-neutral-950 ring-1 ring-black/5">
      {asset.videoURL ? (
        <video src={asset.videoURL} className="h-full w-full object-cover" muted playsInline />
      ) : asset.imageURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.imageURL} alt="" className="h-full w-full object-cover" />
      ) : null}
    </div>
  )
}

const visualSkeleton = 'rounded bg-gray-200 dark:bg-gray-700'

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
          <GhostPropertyGrid cols={2} />
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
      <div className="aspect-[3/1] w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9]">
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
        'group relative block cursor-pointer overflow-hidden rounded-xl ring-2 ring-dashed ring-[#1FA89B]/45 transition hover:ring-[#1FA89B] focus-within:ring-[#1FA89B]',
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
          !hasVisual && 'bg-[#1FA89B]/10',
        )}
      >
        <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#224D62] shadow-lg shadow-black/10 dark:bg-gray-950 dark:text-white">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#1FA89B]" />
          ) : (
            <ImagePlus className="h-4 w-4 text-[#1FA89B]" />
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
    <ol className="grid gap-2 sm:grid-cols-4">
      {STEPS.map((step, index) => {
        const isActive = index === currentStep
        const isDone = index < currentStep
        return (
          <li
            key={step.id}
            className={cn(
              'rounded-xl border p-3 transition',
              isActive
                ? 'border-[#1FA89B] bg-[#1FA89B]/5 text-[#224D62]'
                : isDone
                  ? 'border-[#1FA89B]/30 bg-white text-[#224D62]'
                  : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900',
            )}
            aria-current={isActive ? 'step' : undefined}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  isDone || isActive ? 'bg-[#1FA89B] text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800',
                )}
              >
                {isDone ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </span>
              <span className="font-semibold">{step.title}</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">{step.description}</p>
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

  const credits = Number(user?.credits ?? 0)

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
  const activeFormat =
    formats.find((format) => format.key === activeFormatKey) ??
    formats.find((format) => format.key === 'infeed') ??
    formats[0]
  const activePlacement = activeFormat?.placements[0]
  const activeAsset = activeFormat?.placements.map((placement) => assets[placement]).find(Boolean)

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
      const data = await uploadAdImage(file)
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
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }

  const handleFormatUpload = async (format: AdFormat, file: File) => {
    setFormatUploading(format.key)
    try {
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

      const data = await uploadAdImage(file)
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

  const clearFormat = (format: AdFormat) =>
    setAssets((prev) => {
      const next = { ...prev }
      for (const p of format.placements) delete next[p]
      return next
    })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/advertising/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          creative: {
            imageURL,
            imagePATH,
            assets: Object.keys(assets).length ? assets : undefined,
            headline: headline || undefined,
            body: body || undefined,
            ctaLabel: ctaLabel || undefined,
            ctaUrl: ctaUrl || undefined,
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
      toast({ title: 'Publicité en ligne', description: 'Votre campagne est désormais diffusée.', variant: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['my-ad-campaigns'] })
      router.push(routes.protected.advertising)
    },
    onError: (e: any) => {
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
    !uploading &&
    !formatUploading &&
    !createMutation.isPending

  const canGoNext =
    currentStep === 0
      ? !!selectedPackage
      : currentStep === 1
        ? hasAllPlacementVisuals && !uploading && !formatUploading
        : currentStep === 2
          ? true
          : canPublish

  const goNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((step) => step + 1)
  }

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((step) => step - 1)
  }

  const selectedCreative = {
    imageURL: imageURL || localPreview || undefined,
    headline: headline || undefined,
    body: body || undefined,
    ctaLabel: ctaLabel || undefined,
    ctaUrl: ctaUrl || undefined,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 pb-32 pt-8 md:pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={routes.protected.advertising}
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#224D62]"
          >
            <ArrowLeft className="h-4 w-4" />
            Publicités
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1FA89B]/10 text-[#1FA89B]">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#224D62] dark:text-white">Créer une publicité</h1>
              <p className="text-sm text-gray-500">Construisez la campagne étape par étape.</p>
            </div>
          </div>
        </div>
        <div className="flex min-h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <Wallet className="h-4 w-4 text-[#1FA89B]" />
          <span className="font-semibold">{credits.toLocaleString('fr-FR')} crédits</span>
        </div>
      </header>

      <Stepper currentStep={currentStep} />

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
        {currentStep === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#224D62] dark:text-white">Choisir un forfait</h2>
              <p className="mt-1 text-sm text-gray-500">Le forfait définit les emplacements et la durée de diffusion.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {AD_PACKAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPackageId(p.id)}
                  className={cn(
                    'min-h-44 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA89B]',
                    packageId === p.id
                      ? 'border-[#1FA89B] bg-[#1FA89B]/5 ring-2 ring-[#1FA89B]/20'
                      : 'border-gray-200 hover:border-[#1FA89B]/50 dark:border-gray-700',
                  )}
                >
                  <p className="font-semibold text-[#224D62] dark:text-white">{p.name}</p>
                  <p className="mt-1 text-2xl font-bold text-[#1FA89B]">{p.credits} crédits</p>
                  <p className="mt-2 min-h-10 text-xs leading-5 text-gray-500">{p.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.placements.map((placement) => (
                      <span
                        key={placement}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          placement === 'reels_infeed'
                            ? 'bg-[#1FA89B]/10 text-[#1FA89B]'
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
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#224D62] dark:text-white">Ajouter les visuels</h2>
              <p className="mt-1 text-sm text-gray-500">Choisissez un format, puis cliquez directement dans l’emplacement publicitaire du mockup.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label htmlFor="default-ad-image" className="text-sm">Visuel par défaut</Label>
                  <p className="mt-1 text-xs text-gray-500">Option rapide pour couvrir les emplacements sans visuel dédié.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {(imageURL || localPreview) ? (
                    <div className="h-12 w-20 overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageURL || localPreview} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : null}
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
                  <label
                    htmlFor="default-ad-image"
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-[#224D62] shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 dark:bg-gray-900 dark:text-white dark:ring-gray-700"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin text-[#1FA89B]" /> : <ImagePlus className="h-4 w-4 text-[#1FA89B]" />}
                    {uploading ? 'Import' : (imageURL || localPreview) ? 'Changer' : 'Importer'}
                  </label>
                  {(imageURL || localPreview) ? (
                    <button
                      type="button"
                      onClick={clearDefaultVisual}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Retirer
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_17rem]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Formats du forfait</p>
                {formats.map((fmt) => {
                  const ready = fmt.placements.every(hasVisualForPlacement)
                  const dedicated = fmt.placements.every((placement) => hasAsset(assets[placement]))
                  const previewAsset = fmt.placements.map((placement) => assets[placement]).find(Boolean)
                  return (
                    <button
                      key={fmt.key}
                      type="button"
                      onClick={() => setActiveFormatKey(fmt.key)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA89B]',
                        activeFormat?.key === fmt.key
                          ? 'border-[#1FA89B] bg-[#1FA89B]/5 ring-2 ring-[#1FA89B]/15'
                          : 'border-gray-200 bg-white hover:border-[#1FA89B]/50 dark:border-gray-700 dark:bg-gray-900',
                      )}
                    >
                      <FormatAssetPreview asset={previewAsset} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#224D62] dark:text-white">{fmt.label}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{fmt.recommended}</p>
                        <span
                          className={cn(
                            'mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                            ready
                              ? 'bg-[#1FA89B]/10 text-[#1FA89B]'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300',
                          )}
                        >
                          {dedicated ? 'Visuel dédié' : ready ? 'Par défaut' : 'Manquant'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="min-w-0 rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/40">
                {activeFormat && activePlacement ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-1">
                      <div>
                        <h3 className="font-semibold text-[#224D62] dark:text-white">{activeFormat.label}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {activeFormat.ratioHint} · {activeFormat.recommended}
                          {activeFormat.key === 'reels' ? ' · image ou vidéo jusqu’à 5 min' : ''}
                        </p>
                      </div>
                      {activeFormat.placements.every((placement) => hasAsset(assets[placement])) ? (
                        <button
                          type="button"
                          onClick={() => clearFormat(activeFormat)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-red-600 hover:bg-red-50"
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

              <aside className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#224D62] dark:text-white">
                  <ImagePlus className="h-4 w-4 text-[#1FA89B]" />
                  Progression visuelle
                </div>
                <div className="mt-4 space-y-2">
                  {selectedPackage?.placements.map((placement) => (
                    <div key={placement} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{PACKAGE_PLACEMENT_LABELS[placement]}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', hasVisualForPlacement(placement) ? 'bg-[#1FA89B]/10 text-[#1FA89B]' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                        {hasVisualForPlacement(placement) ? 'Prêt' : 'Manquant'}
                      </span>
                    </div>
                  ))}
                </div>
                {!hasAllPlacementVisuals ? (
                  <p className="mt-4 text-xs leading-5 text-red-600">
                    Ajoutez un visuel par défaut ou un visuel dédié pour chaque emplacement du forfait.
                  </p>
                ) : null}
              </aside>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#224D62] dark:text-white">Préparer le message</h2>
              <p className="mt-1 text-sm text-gray-500">Ces textes sont facultatifs, mais ils rendent la publicité plus claire.</p>
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
                <Label htmlFor="ad-url">Lien au clic</Label>
                <Input
                  id="ad-url"
                  placeholder="https://... ou wa.me/241..."
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#224D62] dark:text-white">Vérifier avant publication</h2>
                <p className="mt-1 text-sm text-gray-500">Contrôlez les emplacements, les visuels et le coût final.</p>
              </div>
              <div className="rounded-xl bg-[#1FA89B]/10 px-4 py-3 text-sm text-[#1FA89B]">
                <span className="font-semibold">{selectedPackage?.name}</span>
                <span className="mx-2">·</span>
                <span>{selectedPackage?.credits} crédits</span>
              </div>
            </div>

            <AdCreativePreview
              creative={selectedCreative}
              assets={assets}
              placements={selectedPackage?.placements ?? []}
            />

            {hasReelsPlacement ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#224D62] dark:text-white">
                  <Video className="h-4 w-4 text-[#1FA89B]" />
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

      <footer className="flex flex-col-reverse gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
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
              {selectedPackage.name} · {selectedPackage.credits} crédits · {selectedPackage.durationDays} j
            </p>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="min-h-11 bg-[#1FA89B] hover:bg-[#188a7f]"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!canPublish}
              className="min-h-11 bg-[#1FA89B] hover:bg-[#188a7f]"
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
