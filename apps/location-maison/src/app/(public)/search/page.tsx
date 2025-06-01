import type { Metadata } from "next";
import React from 'react'
import SearchPageComponent from "@/components/search/SearchPageComponent";
import FilterProviders from "@/providers/FilterProviders";

export const metadata: Metadata = {
  title: "Catalogue des logements - LogisGabon",
  description: "Explorez notre catalogue de logements à louer ou à vendre partout au Gabon. Recherchez facilement des maisons, appartements, studios et plus encore.",
  openGraph: {
    title: "Catalogue immobilier - LogisGabon",
    description: "Trouvez votre futur logement au Gabon parmi des centaines d’annonces vérifiées. Filtrez par ville, type de bien et prix en toute simplicité.",
    url: `${process.env.NEXT_PUBLIC_HOST}/search`,
    type: "website",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.png`,
        width: 1200,
        height: 630,
        alt: "Catalogue LogisGabon",
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