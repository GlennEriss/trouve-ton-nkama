'use client'

import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Loader2, Wallet, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { useRecharge } from '@/providers/RechargeProvider'
import { AD_PACKAGES } from '@/constantes/ad-packages'
import { formatsForPlacements, type AdFormat } from '@/constantes/ad-formats'
import type { AdPlacement } from '@/models/advertising'
import AdCreativePreview from '@/components/ads/AdCreativePreview'
import { uploadAdCreativeVideo } from '@/db/ad-video.db'
import { AD_VIDEO_REJECTION_MESSAGES, validateAdVideoFile } from '@/lib/ads/validate-ad-video'

type AssetMap = Partial<Record<AdPlacement, { imageURL?: string; imagePATH?: string; videoURL?: string; videoPATH?: string }>>

const REELS_FORMAT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm'
const IMAGE_ONLY_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

/** Upload un visuel (self-serve) et renvoie son URL publique + chemin Storage. */
async function uploadAdImage(file: File): Promise<{ imageURL: string; imagePATH: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/advertising/upload', { method: 'POST', body: fd })
  const payload = await res.json()
  if (!res.ok || !payload.success) throw new Error(payload?.error?.message || 'Échec de l’upload.')
  return { imageURL: payload.imageURL as string, imagePATH: payload.imagePATH as string }
}

type MyCampaign = {
  id: string
  title: string
  status: string
  placements: string[]
  imageURL: string
  startDate: string | null
  endDate: string | null
  metrics: { impressions: number; clicks: number }
  creditsUsed: number
}

const STATUS_LABEL: Record<string, string> = {
  active: 'En ligne',
  scheduled: 'Programmée',
  pending_review: 'En validation',
  paused: 'En pause',
  ended: 'Terminée',
  rejected: 'Refusée',
  draft: 'Brouillon',
}

export default function AdvertisingPage() {
  const { user } = useCurrentUser()
  const { toast } = useToast()
  const { openRecharge } = useRecharge()
  const queryClient = useQueryClient()

  const credits = Number(user?.credits ?? 0)

  const [packageId, setPackageId] = useState('visibility')
  const [imageURL, setImageURL] = useState('')
  const [imagePATH, setImagePATH] = useState('')
  const [localPreview, setLocalPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [assets, setAssets] = useState<AssetMap>({})
  const [formatUploading, setFormatUploading] = useState<AdFormat['key'] | null>(null)

  const selectedPackage = AD_PACKAGES.find((p) => p.id === packageId)
  const formats = selectedPackage ? formatsForPlacements(selectedPackage.placements) : []

  const campaignsQuery = useQuery({
    queryKey: ['my-ad-campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/advertising/campaigns')
      const payload = await res.json()
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Erreur')
      return payload.campaigns as MyCampaign[]
    },
  })

  const handleUpload = async (file: File) => {
    // Aperçu instantané (objet local) le temps que l'upload distant se termine.
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

  // Upload d'un visuel par FORMAT : appliqué à tous les emplacements du groupe.
  // Le format "reels" accepte aussi la vidéo (seul format concerné) : bascule
  // vers l'upload direct-Storage + validation durée/taille au lieu de la
  // route /api/advertising/upload (image-only, 3 Mo max).
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
      toast({ title: 'Publicité en ligne 🎉', description: 'Votre campagne est désormais diffusée.', variant: 'success' })
      setImageURL(''); setImagePATH(''); setHeadline(''); setBody(''); setCtaLabel(''); setCtaUrl('')
      setAssets({})
      setLocalPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return '' })
      void queryClient.invalidateQueries({ queryKey: ['my-ad-campaigns'] })
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

  const canPublish = !!imageURL && !!selectedPackage && !uploading && !createMutation.isPending

  return (
    <div className="mx-auto max-w-3xl px-5 pt-8 pb-28 md:pb-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#1FA89B]/10 p-2"><Megaphone className="h-6 w-6 text-[#1FA89B]" /></div>
          <div>
            <h1 className="text-xl font-bold text-[#224D62] dark:text-white">Faire de la pub</h1>
            <p className="text-sm text-gray-500">Créez votre publicité et payez en crédits.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-sm dark:bg-gray-800">
          <Wallet className="h-4 w-4 text-[#1FA89B]" />
          <span className="font-semibold">{credits} crédits</span>
        </div>
      </div>

      {/* Forfaits */}
      <div className="space-y-3">
        <Label className="text-md">1. Choisissez un forfait</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {AD_PACKAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPackageId(p.id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition',
                packageId === p.id ? 'border-[#1FA89B] ring-2 ring-[#1FA89B]/30 bg-[#1FA89B]/5' : 'border-gray-200 hover:border-[#1FA89B]/40',
              )}
            >
              <p className="font-bold text-[#224D62] dark:text-white">{p.name}</p>
              <p className="mt-1 text-lg font-extrabold text-[#1FA89B]">{p.credits} crédits</p>
              <p className="mt-1 text-xs text-gray-500">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Visuel + textes */}
      <div className="space-y-4">
        <Label className="text-md">2. Votre visuel et votre message</Label>
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Visuel par défaut — utilisé partout où aucun visuel dédié n’est fourni ci-dessous.</p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f) }}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
          />
          {uploading ? <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" />Upload…</p> : null}
          {!uploading && imageURL ? <p className="text-xs font-medium text-[#1FA89B]">✓ Visuel importé</p> : null}
          {!uploading && !imageURL && localPreview ? (
            <p className="text-xs font-medium text-red-600">L’import du visuel a échoué (l’aperçu est local). Réessaie de choisir le fichier.</p>
          ) : null}
        </div>

        {/* Visuels par format (optionnel) selon les emplacements du forfait */}
        {formats.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Visuels par format (optionnel)</p>
            <p className="text-[11px] text-gray-400">Pour un rendu optimal, fournissez un visuel adapté à chaque forme. Sinon le visuel par défaut est utilisé.</p>
            {formats.map((fmt) => {
              const imported = fmt.placements.every((p) => assets[p])
              return (
                <div key={fmt.key} className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="min-w-[140px] flex-1">
                    <span className="font-medium text-[#224D62] dark:text-gray-200">{fmt.label}</span>
                    <span className="ml-1 text-gray-400">— {fmt.ratioHint} ({fmt.recommended})</span>
                    {fmt.key === 'reels' && <span className="ml-1 text-gray-400">· vidéo jusqu&apos;à 5 min</span>}
                  </div>
                  <input
                    type="file"
                    accept={fmt.key === 'reels' ? REELS_FORMAT_ACCEPT : IMAGE_ONLY_ACCEPT}
                    disabled={formatUploading === fmt.key}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFormatUpload(fmt, f) }}
                    className="block max-w-[170px] text-[11px] text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1"
                  />
                  {formatUploading === fmt.key ? (
                    <span className="text-gray-500">Upload…</span>
                  ) : imported ? (
                    <button type="button" className="text-[#1FA89B]" onClick={() => clearFormat(fmt)}>✓ importé · retirer</button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        <Input placeholder="Texte d'accroche (ex: -20% ce week-end)" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        <Input placeholder="Description courte (optionnel)" value={body} onChange={(e) => setBody(e.target.value)} />
        <Input placeholder="Texte du bouton (ex: Appeler, WhatsApp, Voir)" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
        <Input placeholder="Lien au clic (https://… ou wa.me/241…)" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
      </div>

      {/* Aperçu fidèle avant publication */}
      <div className="space-y-3">
        <Label className="text-md">3. Aperçu avant publication</Label>
        <AdCreativePreview
          creative={{
            imageURL: imageURL || localPreview || undefined,
            headline: headline || undefined,
            body: body || undefined,
            ctaLabel: ctaLabel || undefined,
            ctaUrl: ctaUrl || undefined,
          }}
          assets={assets}
          placements={selectedPackage?.placements ?? []}
        />
      </div>

      {/* Publier */}
      <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {selectedPackage ? `${selectedPackage.name} — ${selectedPackage.credits} crédits / ${selectedPackage.durationDays} j` : ''}
        </p>
        <Button onClick={() => createMutation.mutate()} disabled={!canPublish} className="bg-[#1FA89B] hover:bg-[#188a7f]">
          {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
          Payer {selectedPackage?.credits} crédits & publier
        </Button>
      </div>

      {/* Mes publicités */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[#224D62] dark:text-white">Mes publicités</h2>
        {campaignsQuery.isLoading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : (campaignsQuery.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-500">Aucune publicité pour le moment.</p>
        ) : (
          campaignsQuery.data?.map((c) => (
            <Card key={c.id} className="flex items-center gap-3 p-3">
              {c.imageURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageURL} alt="" className="h-12 w-20 rounded object-cover" />
              ) : null}
              <div className="flex-1">
                <p className="font-medium text-[#224D62] dark:text-white">{c.title}</p>
                <p className="text-xs text-gray-500">👁 {c.metrics.impressions} · 🖱 {c.metrics.clicks} · {c.creditsUsed} crédits</p>
              </div>
              <span className="rounded-full bg-[#1FA89B]/10 px-3 py-1 text-xs font-medium text-[#1FA89B]">
                {STATUS_LABEL[c.status] ?? c.status}
              </span>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
