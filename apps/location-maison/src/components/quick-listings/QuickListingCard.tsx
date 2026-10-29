import Link from 'next/link';
import { quickListingPath, type PublicQuickListing } from '@/features/quick-listings/public-listing';

export default function QuickListingCard({ item }: { item: PublicQuickListing }) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <span className="self-start rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">Annonce rapide · Sans photo</span>
      <h3 className="mt-4 break-words font-semibold text-gray-900 dark:text-white">{item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{item.province}</p>
      <p className="mt-4 line-clamp-4 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200">{item.description}</p>
      <p className="mb-4 mt-4 text-sm text-gray-600 dark:text-gray-300">Visitez le bien avant tout paiement.</p>
      <Link href={quickListingPath(item.id)} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Lire l’annonce<span className="sr-only"> à {item.city}</span></Link>
    </article>
  );
}
