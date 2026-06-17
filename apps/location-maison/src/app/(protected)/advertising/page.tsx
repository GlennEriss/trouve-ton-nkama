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
  const [uploading, setUploading] = useState(false)
  const [headline, setHeadline] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')

  const selectedPackage = AD_PACKAGES.find((p) => p.id === packageId)

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
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/advertising/upload', { method: 'POST', body: fd })
      const payload = await res.json()
      if (!res.ok || !payload.success) throw new Error(payload?.error?.message || 'Échec de l’upload.')
      setImageURL(payload.imageURL)
      setImagePATH(payload.imagePATH)
    } catch (e) {
      toast({ title: 'Upload impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/advertising/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          creative: { imageURL, imagePATH, headline: headline || undefined, ctaUrl: ctaUrl || undefined },
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
      setImageURL(''); setImagePATH(''); setHeadline(''); setCtaUrl('')
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
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f) }}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
          />
          {uploading ? <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" />Upload…</p> : null}
          {imageURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageURL} alt="Aperçu" className="h-40 w-full rounded-lg object-cover" />
          ) : null}
        </div>
        <Input placeholder="Texte d'accroche (ex: -20% ce week-end)" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        <Input placeholder="Lien au clic (https://… ou wa.me/241…)" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
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
