import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getPublicQuickListing } from '@/features/quick-listings/public-listing.server';
import { quickListingTitle } from '@/features/quick-listings/public-listing';
import QuickListingDetail from '@/components/quick-listings/QuickListingDetail';

export const dynamic = 'force-dynamic';
const readListing = cache(getPublicQuickListing);
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await readListing((await params).id);
  if (!item) return { title: 'Annonce indisponible', robots: { index: false, follow: false }, openGraph: { images: [], title: 'Annonce indisponible', description: '' }, twitter: { card: 'summary', images: [], title: 'Annonce indisponible', description: '' } };
  const title = quickListingTitle(item);
  const description = 'Offre immobilière sans photo. Consultez le texte de l’annonce et les précautions avant tout engagement.';
  return { title, description, openGraph: { title, description, type: 'website', images: [] }, twitter: { card: 'summary', title, description, images: [] } };
}

export default async function QuickListingPage({ params }: Props) {
  const item = await readListing((await params).id);
  if (!item) notFound();
  return <QuickListingDetail item={item} />;
}
