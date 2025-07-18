import type { Metadata } from "next";
import React from 'react'
import SearchPageComponent from "@/components/search/SearchPageComponent";
import FilterProviders from "@/providers/FilterProviders";

export const metadata: Metadata = {
  title: "Catalogue des biens immobiliers - Trouve Ton Nkama",
  description: "Explorez notre catalogue des biens immobiliers à louer ou à vendre partout au Gabon. Recherchez facilement des maisons, appartements, studios et plus encore.",
  openGraph: {
    title: "Catalogue immobilier - Trouve Ton Nkama",
    description: "Trouvez votre futur logement au Gabon parmi des centaines d’annonces vérifiées. Filtrez par ville, type de bien et prix en toute simplicité.",
    url: `${process.env.NEXT_PUBLIC_HOST}/search`,
    type: "website",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.svg`,
        width: 1200,
        height: 630,
        alt: "Catalogue Trouve Ton Nkama",
      },
    ],
  },
};

export default function page() {
  return (
    <FilterProviders>
      <SearchPageComponent />
    </FilterProviders>
  )
}