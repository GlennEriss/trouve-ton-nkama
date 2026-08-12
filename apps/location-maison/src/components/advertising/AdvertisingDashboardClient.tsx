'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Eye,
  Megaphone,
  MousePointerClick,
  Percent,
  PlusCircle,
  Wallet,
} from 'lucide-react'

import { Button } from '@trouve-ton-nkama/ui/button'
import { Card } from '@trouve-ton-nkama/ui/card'
import { routes } from '@/constantes/routes'
import { useCurrentUser } from '@/hooks/use-current-user'
import { cn } from '@/lib/utils'
import {
  formatClickThroughRate,
  formatCampaignDate,
  getStatusClassName,
  PACKAGE_PLACEMENT_LABELS,
  STATUS_LABEL,
  type MyCampaign,
} from './advertising-shared'
import type { AdPlacement } from '@/models/advertising'

async function fetchCampaigns() {
  const res = await fetch('/api/advertising/campaigns')
  const payload = await res.json()
  if (!res.ok || !payload.success) throw new Error(payload.message || 'Impossible de charger vos publicités.')
  return payload.campaigns as MyCampaign[]
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-ink dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function CampaignMedia({ campaign }: { campaign: MyCampaign }) {
  if (campaign.videoURL) {
    return (
      <video
        src={campaign.videoURL}
        className="h-20 w-16 rounded-lg bg-neutral-950 object-cover sm:h-24 sm:w-20"
        muted
        playsInline
      />
    )
  }

  if (campaign.imageURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={campaign.imageURL}
        alt=""
        className="h-20 w-24 rounded-lg bg-gray-100 object-cover sm:h-24 sm:w-28"
        loading="lazy"
      />
    )
  }

  return (
    <div className="flex h-20 w-24 items-center justify-center rounded-lg bg-gray-100 text-gray-400 sm:h-24 sm:w-28">
      <Megaphone className="h-5 w-5" />
    </div>
  )
}

function CampaignCard({ campaign }: { campaign: MyCampaign }) {
  return (
    <Card className="overflow-hidden rounded-xl border-gray-200 shadow-sm dark:border-gray-700">
      <div className="flex gap-4 p-4">
        <CampaignMedia campaign={campaign} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-ink dark:text-white">
                {campaign.title || 'Publicité'}
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {campaign.placements.map((placement) => (
                  <span
                    key={placement}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {PACKAGE_PLACEMENT_LABELS[placement as AdPlacement] ?? placement}
                  </span>
                ))}
              </div>
            </div>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold ring-1',
                getStatusClassName(campaign.status),
              )}
            >
              {STATUS_LABEL[campaign.status] ?? campaign.status}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2 lg:grid-cols-5">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-gray-400" />
              {campaign.metrics.impressions.toLocaleString('fr-FR')} vues
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MousePointerClick className="h-4 w-4 text-gray-400" />
              {campaign.metrics.clicks.toLocaleString('fr-FR')} clics
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-gray-400" />
              {formatClickThroughRate(
                campaign.metrics.impressions,
                campaign.metrics.clicks,
              )} de clics
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CircleDollarSign className="h-4 w-4 text-gray-400" />
              {campaign.creditsUsed.toLocaleString('fr-FR')} crédits
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-gray-400" />
              {formatCampaignDate(campaign.endDate)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function AdvertisingDashboardClient() {
  const { user } = useCurrentUser()
  const credits = Number(user?.credits ?? 0)

  const campaignsQuery = useQuery({
    queryKey: ['my-ad-campaigns'],
    queryFn: fetchCampaigns,
  })

  const campaigns = campaignsQuery.data ?? []
  const activeCount = campaigns.filter((campaign) => campaign.status === 'active').length
  const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.metrics.impressions, 0)
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.metrics.clicks, 0)

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 pb-28 pt-8 md:pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink dark:text-white">Publicités</h1>
              <p className="text-sm text-gray-500">Suivez vos campagnes et leurs résultats.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <Wallet className="h-4 w-4 text-secondary" />
            <span className="font-semibold">{credits.toLocaleString('fr-FR')} crédits</span>
          </div>
          <Button asChild className="min-h-10 bg-secondary px-4 hover:bg-primary-600">
            <Link href={routes.protected.advertising_create}>
              <PlusCircle className="h-4 w-4" />
              Créer une publicité
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={BarChart3} label="Campagnes actives" value={activeCount} />
        <StatTile icon={Eye} label="Vues" value={totalImpressions.toLocaleString('fr-FR')} />
        <StatTile icon={MousePointerClick} label="Clics" value={totalClicks.toLocaleString('fr-FR')} />
        <StatTile
          icon={Percent}
          label="Taux de clic"
          value={formatClickThroughRate(totalImpressions, totalClicks)}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink dark:text-white">Mes publicités</h2>
            <p className="text-sm text-gray-500">Toutes les campagnes créées depuis votre compte.</p>
          </div>
        </div>

        {campaignsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : campaignsQuery.isError ? (
          <Card className="rounded-xl border-red-100 bg-red-50 p-5 text-red-700 shadow-sm">
            <p className="font-medium">Impossible de charger vos publicités.</p>
            <p className="mt-1 text-sm">Actualisez la page ou reconnectez-vous.</p>
          </Card>
        ) : campaigns.length === 0 ? (
          <Card className="rounded-xl border-dashed border-gray-300 p-8 text-center shadow-sm dark:border-gray-700">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Megaphone className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink dark:text-white">
              Aucune publicité pour le moment
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Créez une campagne pour promouvoir un logement, un service ou une annonce dans les surfaces Trouve Ton Nkama.
            </p>
            <Button asChild className="mt-5 bg-secondary hover:bg-primary-600">
              <Link href={routes.protected.advertising_create}>
                <PlusCircle className="h-4 w-4" />
                Créer une publicité
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
