import type { Metadata } from 'next';
import React from 'react';
import SearchWithAIPage from '@/components/search-ai/SearchWithAIPage';
import { withCanonical, withNoIndex } from '@/lib/seo/metadata';

const searchWithAIMetadata: Metadata = {
  title: 'Recherche IA de logements - Trouve Ton Nkama',
  description:
    "Utilisez l'assistant IA pour rechercher des logements avec des suggestions intelligentes de budget, zone et critères.",
};
export const metadata: Metadata = withNoIndex(withCanonical(searchWithAIMetadata, '/search-with-ia'));

export default function Page() {
  return <SearchWithAIPage />;
}
