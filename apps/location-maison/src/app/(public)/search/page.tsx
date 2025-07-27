import type { Metadata } from "next";
import React from 'react'
import SearchPageComponent from "@/components/search/SearchPageComponent";
import FilterProviders from "@/providers/FilterProviders";

export const metadata: Metadata = {
  title: "Catalogue des biens immobiliers - Trouve Ton Nkama",
  description: "Explorez notre catalogue des biens immobiliers à louer ou à vendre partout au Gabon. Recherchez facilement des maisons, appartements, studios et plus encore.",
};

export default function page() {
  return (
    <FilterProviders>
      <SearchPageComponent />
    </FilterProviders>
  )
}