import React from 'react';
import { render, screen } from '@testing-library/react';
import Page, { generateMetadata } from '@/app/(public)/annonces-rapides/[id]/page';
import { getPublicQuickListing } from '@/features/quick-listings/public-listing.server';

jest.mock('@/features/quick-listings/public-listing.server', () => ({ getPublicQuickListing: jest.fn() }));
jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }));
jest.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
const read = jest.mocked(getPublicQuickListing);
const props = { params: Promise.resolve({ id: 'example' }) };
beforeEach(() => jest.resetAllMocks());
it('renvoie une fiche publique', async () => {
  read.mockResolvedValue({ id: 'example', description: 'Maison sans photo à louer', province: 'Estuaire', city: 'Libreville', contactPhone: '+24174124961' });
  render(await Page(props));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Annonce sans photo à Libreville');
  const metadata = await generateMetadata(props);
  expect(metadata.openGraph).toMatchObject({ images: [], title: 'Annonce sans photo à Libreville' });
  expect(metadata.twitter).toMatchObject({ images: [], card: 'summary' });
});
it('ne divulgue pas les annonces indisponibles dans la page ou les métadonnées', async () => {
  read.mockResolvedValue(null);
  await expect(Page(props)).rejects.toThrow('NOT_FOUND');
  expect(await generateMetadata(props)).toMatchObject({ title: 'Annonce indisponible', robots: { index: false } });
});
it('propage les pannes vers la frontière erreur, sans les transformer en annonce vide', async () => {
  read.mockRejectedValue(new Error('offline'));
  await expect(Page(props)).rejects.toThrow('offline');
});
