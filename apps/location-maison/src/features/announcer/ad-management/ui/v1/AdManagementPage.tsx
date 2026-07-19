'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import PromotionBadge from '@/components/promotion/PromotionBadge';
import PromotionButton from '@/components/promotion/PromotionButton';
import { routes } from '@/constantes/routes';
import { TypeProperty } from '@/constantes/property-type';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Property } from '@/models/annonce';
import { resolveThumbnailUrl } from '@/lib/property-images';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Archive,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  Eye,
  Filter,
  Gift,
  Layers3,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Video,
  X,
} from 'lucide-react';
import { useAdManagement } from '../../hooks';

const TYPE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '__all', label: 'Tous types' },
  { value: 'Home', label: 'Maisons' },
  { value: 'Apartment', label: 'Appartements' },
  { value: 'Studio', label: 'Studios' },
  { value: 'Room', label: 'Chambres' },
  { value: 'Desk', label: 'Bureaux' },
  { value: 'Building', label: 'Immeubles' },
  { value: 'Shop', label: 'Magasins' },
  { value: 'Kiosk', label: 'Kiosques' },
  { value: 'Land', label: 'Terrains' },
  { value: 'Villa', label: 'Villas' },
];

const STATUS_OPTIONS = [
  { value: '__all', label: 'Location + Vente' },
  { value: 'FOR_RENT', label: 'Location' },
  { value: 'FOR_SALE', label: 'Vente' },
];

const STATE_OPTIONS = [
  { value: '__all', label: 'Actives + Archivées' },
  { value: 'IN_PROGRESS', label: 'Actives' },
  { value: 'ARCHIVED', label: 'Archivées' },
];

const PROMOTED_OPTIONS = [
  { value: '__all', label: 'Avec ou sans promotion' },
  { value: 'true', label: 'Promues uniquement' },
  { value: 'false', label: 'Non promues' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus récentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'updated_desc', label: 'Dernière mise à jour' },
  { value: 'title_asc', label: 'Titre A → Z' },
];

const CONTROL_CLASS =
  'h-12 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm shadow-none transition-colors focus-visible:border-[#1FA89B] focus-visible:ring-0 dark:border-gray-700 dark:bg-gray-800/70';

const SELECT_TRIGGER_CLASS =
  'h-12 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm shadow-none transition-colors focus:ring-0 focus:border-[#1FA89B] dark:border-gray-700 dark:bg-gray-800/70';

function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'object' && value !== null) {
    const objectValue = value as {
      toDate?: unknown;
      toMillis?: unknown;
      seconds?: unknown;
      nanoseconds?: unknown;
      _seconds?: unknown;
      _nanoseconds?: unknown;
    };

    if (typeof objectValue.toDate === 'function') {
      try {
        const parsed = objectValue.toDate() as Date;
        if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch {
        // no-op
      }
    }

    if (typeof objectValue.toMillis === 'function') {
      try {
        const millis = Number(objectValue.toMillis());
        if (Number.isFinite(millis)) {
          const parsed = new Date(millis);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
      } catch {
        // no-op
      }
    }

    const secondsRaw = objectValue.seconds ?? objectValue._seconds;
    const nanosRaw = objectValue.nanoseconds ?? objectValue._nanoseconds;
    const seconds = Number(secondsRaw);
    const nanoseconds = Number(nanosRaw ?? 0);
    if (Number.isFinite(seconds)) {
      const millis = seconds * 1000 + (Number.isFinite(nanoseconds) ? nanoseconds / 1_000_000 : 0);
      if (Number.isFinite(millis)) {
        const parsed = new Date(millis);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function formatDate(value: unknown): string {
  const parsed = toDate(value);
  if (!parsed) {
    return '—';
  }
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function resolveTypeLabel(typeProperty: string): string {
  return TypeProperty[typeProperty] ?? typeProperty;
}

function getSortValue(sortBy: string, sortOrder: string): string {
  if (sortBy === 'createdAt' && sortOrder === 'desc') return 'recent';
  if (sortBy === 'createdAt' && sortOrder === 'asc') return 'oldest';
  if (sortBy === 'price' && sortOrder === 'asc') return 'price_asc';
  if (sortBy === 'price' && sortOrder === 'desc') return 'price_desc';
  if (sortBy === 'updatedAt' && sortOrder === 'desc') return 'updated_desc';
  if (sortBy === 'title' && sortOrder === 'asc') return 'title_asc';
  return 'recent';
}

type StatCardProps = {
  title: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'success' | 'warning' | 'accent';
};

function StatCard({ title, value, icon: Icon, tone = 'neutral' }: StatCardProps) {
  return (
    <Card
      className={cn(
        'border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
        tone === 'success' && 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/20',
        tone === 'warning' && 'border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-900/20',
        tone === 'accent' && 'border-[#1FA89B]/30 bg-[#1FA89B]/5 dark:border-[#1FA89B]/50 dark:bg-[#1FA89B]/10',
        tone === 'neutral' && 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2 dark:bg-black/20">
          <Icon className="h-5 w-5 text-[#146B67]" />
        </div>
      </div>
    </Card>
  );
}

type AdCardProps = {
  ad: Property;
  onToggleState: (ad: Property) => void;
  onDelete: (ad: Property) => void;
  actionLoading: boolean;
};

const MODERATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente de validation',
  APPROVED: 'Publiée',
  REJECTED: 'Rejetée',
};

const MODERATION_STATUS_CLASSES: Record<string, string> = {
  PENDING: 'bg-amber-100/95 text-amber-800',
  APPROVED: 'bg-emerald-100/90 text-emerald-800',
  REJECTED: 'bg-red-100/95 text-red-800',
};

function AdCard({ ad, onToggleState, onDelete, actionLoading }: AdCardProps) {
  const statusLabel = ad.status === 'FOR_RENT' ? 'À louer' : 'À vendre';
  const stateLabel = ad.state === 'IN_PROGRESS' ? 'Active' : 'Archivée';
  const publishedAt = formatDate(ad.createdAt);
  const updatedAt = formatDate(ad.updatedAt);
  const mainImage = resolveThumbnailUrl(ad.images?.[0]) || '/home.png';
  const moderationLabel = ad.moderationStatus ? MODERATION_STATUS_LABELS[ad.moderationStatus] : null;
  const moderationClass = ad.moderationStatus ? MODERATION_STATUS_CLASSES[ad.moderationStatus] : '';

  return (
    <Card
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
      style={{ minHeight: 500 }}
    >
      <div
        className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-800"
        style={{ height: 200, minHeight: 200, maxHeight: 200 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainImage}
          alt={ad.title}
          className="h-full w-full"
          style={{ objectFit: 'cover' }}
        />
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-900 backdrop-blur">
            {statusLabel}
          </span>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur',
              ad.state === 'IN_PROGRESS'
                ? 'bg-emerald-100/90 text-emerald-800'
                : 'bg-amber-100/95 text-amber-800'
            )}
          >
            {stateLabel}
          </span>
          {moderationLabel && (
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur',
                moderationClass
              )}
            >
              {moderationLabel}
            </span>
          )}
          <PromotionBadge property={ad} />
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 min-h-[3rem] text-lg font-semibold text-gray-900 dark:text-white">
            {ad.title || 'Annonce sans titre'}
          </h3>
          <p className="line-clamp-1 text-sm text-gray-500 dark:text-gray-400">
            {resolveTypeLabel(ad.typeProperty)} • {ad.area || 0} m²
          </p>
          {ad.moderationStatus === 'REJECTED' && ad.rejectionReason && (
            <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
              Motif du rejet : {ad.rejectionReason}
            </p>
          )}
          <p className="line-clamp-1 inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
            <MapPin className="h-4 w-4 text-[#146B67]" />
            {ad.street}, {ad.city}, {ad.province}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-sm dark:border-gray-800 dark:bg-gray-800/40">
          <p className="text-lg font-bold text-[#146B67]">
            {formatPrice(Number(ad.price || 0))} <span className="text-sm font-medium">FCFA</span>
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Publiée: {publishedAt}
            </p>
            <p>Maj: {updatedAt}</p>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 rounded-full" asChild>
              <Link href={`${routes.protected.properties}/${ad.id}`}>
                <Eye className="mr-1.5 h-4 w-4" />
                Voir
              </Link>
            </Button>
            <Button variant="outline" className="h-11 rounded-full" asChild>
              <Link href={`${routes.protected.properties}/modify/${ad.id}`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Modifier
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => onToggleState(ad)}
              disabled={actionLoading}
            >
              <Archive className="mr-1.5 h-4 w-4" />
              {ad.state === 'IN_PROGRESS' ? 'Archiver' : 'Activer'}
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20"
              onClick={() => onDelete(ad)}
              disabled={actionLoading}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Supprimer
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <Button variant="outline" className="h-11 w-full rounded-full px-3" asChild>
              <Link href={`${routes.protected.properties}/${ad.id}/reels/add`}>
                <Video className="mr-1 h-4 w-4" />
                Ajouter un réel
              </Link>
            </Button>
            <PromotionButton property={ad} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function AdManagementPage() {
  const {
    userUid,
    items,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasMore,
    total,
    filteredTotal,
    summary,
    searchInput,
    setSearchInput,
    filters,
    setTypeFilter,
    setStatusFilter,
    setStateFilter,
    setPromotedFilter,
    setPriceMin,
    setPriceMax,
    setSort,
    resetFilters,
    hasActiveFilters,
    fetchNextPage,
    toggleAdState,
    removeAd,
    isTogglingState,
    isRemoving,
    error,
  } = useAdManagement();
  const { toast } = useToast();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [toggleStateCandidate, setToggleStateCandidate] = useState<Property | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Property | null>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasMore || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchNextPage();
        }
      },
      {
        rootMargin: '320px',
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [fetchNextPage, hasMore, isFetchingNextPage]);

  const sortValue = useMemo(
    () => getSortValue(filters.sortBy, filters.sortOrder),
    [filters.sortBy, filters.sortOrder]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      if (value === 'oldest') {
        setSort('createdAt', 'asc');
      } else if (value === 'price_asc') {
        setSort('price', 'asc');
      } else if (value === 'price_desc') {
        setSort('price', 'desc');
      } else if (value === 'updated_desc') {
        setSort('updatedAt', 'desc');
      } else if (value === 'title_asc') {
        setSort('title', 'asc');
      } else {
        setSort('createdAt', 'desc');
      }
    },
    [setSort]
  );

  const handleToggleState = useCallback(
    async (ad: Property) => {
      await toggleAdState(ad);
      toast({
        title: 'Annonce mise à jour',
        description:
          ad.state === 'IN_PROGRESS'
            ? 'L’annonce a été archivée.'
            : 'L’annonce a été réactivée.',
        variant: 'success',
        duration: 4000,
      });
    },
    [toast, toggleAdState]
  );

  const handleDelete = useCallback(
    async (adId: string) => {
      await removeAd(adId);
      toast({
        title: 'Annonce supprimée',
        description: 'La suppression a été effectuée avec succès.',
        variant: 'warning',
        duration: 4500,
      });
    },
    [removeAd, toast]
  );

  const requestToggleState = useCallback((ad: Property) => {
    setToggleStateCandidate(ad);
  }, []);

  const requestDelete = useCallback((ad: Property) => {
    setDeleteCandidate(ad);
  }, []);

  const confirmToggleState = useCallback(async () => {
    if (!toggleStateCandidate) {
      return;
    }

    try {
      await handleToggleState(toggleStateCandidate);
    } finally {
      setToggleStateCandidate(null);
    }
  }, [handleToggleState, toggleStateCandidate]);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate?.id) {
      setDeleteCandidate(null);
      return;
    }

    try {
      await handleDelete(deleteCandidate.id);
    } finally {
      setDeleteCandidate(null);
    }
  }, [deleteCandidate, handleDelete]);

  return (
    <div className="space-y-6 px-4 pb-20 pt-2 md:px-0 md:pb-8">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#146B67]">
              <Building2 className="h-3.5 w-3.5" />
              Espace annonceur
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">Gestion des annonces</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Recherchez, filtrez et pilotez vos annonces depuis un seul espace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full px-6 font-semibold"
            >
              <Link href={routes.protected.reels_mine}>
                <Video className="mr-2 h-4 w-4" />
                Mes réels
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full px-6 font-semibold"
            >
              <Link href={routes.protected.gifts}>
                <Gift className="mr-2 h-4 w-4" />
                Mes cadeaux
              </Link>
            </Button>
            <Button
              asChild
              className="h-12 rounded-full bg-gradient-to-r from-[#146B67] to-[#1FA89B] px-6 font-semibold hover:from-[#115a56] hover:to-[#1a9388]"
            >
              <Link href={routes.protected.add_property}>
                <Plus className="mr-2 h-4 w-4" />
                Publier une annonce
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total annonces" value={summary.global.total} icon={Layers3} tone="accent" />
        <StatCard title="Actives" value={summary.global.active} icon={TrendingUp} tone="success" />
        <StatCard title="Archivées" value={summary.global.archived} icon={Archive} tone="warning" />
        <StatCard title="Promues" value={summary.global.promoted} icon={BadgeDollarSign} tone="accent" />
        <StatCard title="À louer" value={summary.global.forRent} icon={Building2} />
        <StatCard title="À vendre" value={summary.global.forSale} icon={Building2} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label htmlFor="property-search" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Recherche</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-gray-400" />
              <Input
                id="property-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Titre, description, ville, quartier..."
                className={`${CONTROL_CLASS} pl-10 pr-10`}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="property-type-filter" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
            <Select
              value={filters.type || '__all'}
              onValueChange={(value) => setTypeFilter(value === '__all' ? '' : (value as any))}
            >
              <SelectTrigger id="property-type-filter" aria-label="Type de bien" className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="property-status-filter" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Statut</label>
            <Select
              value={filters.status || '__all'}
              onValueChange={(value) => setStatusFilter(value === '__all' ? '' : (value as any))}
            >
              <SelectTrigger id="property-status-filter" aria-label="Statut de l'annonce" className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="property-state-filter" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">État</label>
            <Select
              value={filters.state || '__all'}
              onValueChange={(value) => setStateFilter(value === '__all' ? '' : (value as any))}
            >
              <SelectTrigger id="property-state-filter" aria-label="État de publication" className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="property-promotion-filter" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Promotion</label>
            <Select
              value={filters.promoted || '__all'}
              onValueChange={(value) => setPromotedFilter(value === '__all' ? '' : (value as any))}
            >
              <SelectTrigger id="property-promotion-filter" aria-label="État de promotion" className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMOTED_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <label htmlFor="property-price-min" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Prix min (FCFA)</label>
            <Input
              id="property-price-min"
              inputMode="numeric"
              value={filters.priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
              placeholder="0"
              className={CONTROL_CLASS}
            />
          </div>
          <div>
            <label htmlFor="property-price-max" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Prix max (FCFA)</label>
            <Input
              id="property-price-max"
              inputMode="numeric"
              value={filters.priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
              placeholder="2000000"
              className={CONTROL_CLASS}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="property-sort" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Tri</label>
            <Select value={sortValue} onValueChange={handleSortChange}>
              <SelectTrigger id="property-sort" aria-label="Ordre de tri" className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              className="h-12 w-full rounded-full border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/70 dark:hover:bg-gray-800"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              <Filter className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>{filteredTotal}</strong> annonce(s) affichée(s) sur <strong>{total}</strong> au total.
        </p>
        {isFetching && !isLoading && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Actualisation en cours…</p>
        )}
      </section>

      {error && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </section>
      )}

      {isLoading && items.length === 0 && (
        <section className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`ad-management-skeleton-${index}`} className="h-[390px] rounded-2xl" />
          ))}
        </section>
      )}

      {!isLoading && items.length === 0 && (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <Building2 className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Aucune annonce trouvée</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Ajustez vos filtres ou publiez une nouvelle annonce.
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              asChild
              className="h-11 rounded-full bg-gradient-to-r from-[#146B67] to-[#1FA89B] px-6 hover:from-[#115a56] hover:to-[#1a9388]"
            >
              <Link href={routes.protected.add_property}>
                <Plus className="mr-2 h-4 w-4" />
                Publier une annonce
              </Link>
            </Button>
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              onToggleState={requestToggleState}
              onDelete={requestDelete}
              actionLoading={isTogglingState || isRemoving}
            />
          ))}
        </section>
      )}

      <div ref={sentinelRef} className="h-2 w-full" />

      {hasMore && (
        <div className="flex justify-center pb-3">
          <Button
            variant="outline"
            className="h-11 rounded-full border-gray-200 bg-gray-50 px-6 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/70 dark:hover:bg-gray-800"
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Chargement…' : 'Voir plus d’annonces'}
          </Button>
        </div>
      )}

      {!userUid && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          Session indisponible. Reconnectez-vous pour gérer vos annonces.
        </section>
      )}

      <Dialog
        open={Boolean(toggleStateCandidate)}
        onOpenChange={(open) => {
          if (!open) {
            setToggleStateCandidate(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-gray-200 p-6 dark:border-gray-800" isDefaultIconClose={!isTogglingState}>
          <DialogHeader>
            <DialogTitle>
              {toggleStateCandidate?.state === 'IN_PROGRESS'
                ? 'Archiver cette annonce ?'
                : 'Réactiver cette annonce ?'}
            </DialogTitle>
            <DialogDescription>
              {toggleStateCandidate?.state === 'IN_PROGRESS'
                ? 'Cette annonce ne sera plus visible dans vos annonces actives.'
                : 'Cette annonce redeviendra visible dans vos annonces actives.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setToggleStateCandidate(null)}
              disabled={isTogglingState}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="rounded-full bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#115a56] hover:to-[#1a9388]"
              onClick={() => void confirmToggleState()}
              disabled={isTogglingState}
            >
              {isTogglingState
                ? 'Traitement...'
                : toggleStateCandidate?.state === 'IN_PROGRESS'
                  ? 'Archiver'
                  : 'Réactiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteCandidate)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCandidate(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-gray-200 p-6 dark:border-gray-800" isDefaultIconClose={!isRemoving}>
          <DialogHeader>
            <DialogTitle>Supprimer cette annonce ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive. L’annonce sera supprimée de votre compte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setDeleteCandidate(null)}
              disabled={isRemoving}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              onClick={() => void confirmDelete()}
              disabled={isRemoving}
            >
              {isRemoving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
