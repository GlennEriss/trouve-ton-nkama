import type { Metadata } from 'next';
import React from 'react';
import SearchWithAIPage from '@/components/search-ai/SearchWithAIPage';

export const metadata: Metadata = {
  title: 'Recherche IA de logements - Trouve Ton Nkama',
  description:
    "Utilisez l'assistant IA pour rechercher des logements avec des suggestions intelligentes de budget, zone et critères.",
};

export default function Page() {
  return <SearchWithAIPage />;
}
