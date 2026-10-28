'use client';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { PublicQuickListing } from '@/features/quick-listings/public-listing';
import QuickListingCard from './QuickListingCard';
import QuickListingSafetyNotice from './QuickListingSafetyNotice';

export default function QuickListingsFeed({ preview = false }: { preview?: boolean }) {
  const limit = preview ? 4 : 20;
  const { data, isPending, isError, isFetching, fetchNextPage, hasNextPage, refetch } = useInfiniteQuery({
    queryKey: ['quick-listings', limit],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<{ items: PublicQuickListing[]; nextCursor: string | null }> => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (pageParam) params.set('cursor', pageParam);
      const response = await fetch(`/api/quick-listings?${params}`, { signal });
      if (!response.ok) throw new Error('unavailable');
      return response.json();
    },
    getNextPageParam: page => page.nextCursor,
    staleTime: 30_000,
    retry: 1,
  });
  const items = [...new Map(data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? []).values()];
  const Heading = preview ? 'h2' : 'h1';
  return (
    <section aria-label="Annonces rapides" className="space-y-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Heading className="text-xl font-bold text-primary lg:text-2xl">Annonces rapides</Heading>
        {preview && <Link href="/search?category=Rapides" className="inline-flex min-h-11 items-center rounded-lg px-4 font-semibold text-primary hover:underline">Voir tout<span className="sr-only"> : annonces rapides</span></Link>}
      </header>
      {preview ? <p className="text-gray-700 dark:text-gray-200">Offres sans photos : visitez le bien avant tout paiement.</p> : <QuickListingSafetyNotice />}
      {isPending && <p role="status">Chargement des annonces rapides…</p>}
      {isError && <div role="alert"><p>Impossible de charger les annonces rapides.</p><button type="button" disabled={isFetching} onClick={() => void refetch()} className="min-h-11 px-4 text-primary underline">Réessayer</button></div>}
      {!isPending && !isError && !items.length && <p>Aucune annonce rapide disponible pour le moment.</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{items.map(item => <QuickListingCard key={item.id} item={item} />)}</div>
      {!preview && hasNextPage && <button type="button" disabled={isFetching} onClick={() => void fetchNextPage()} className="min-h-11 rounded-full bg-primary px-5 py-3 text-white disabled:opacity-50">{isFetching ? 'Chargement…' : 'Afficher plus'}</button>}
    </section>
  );
}
