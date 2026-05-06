import type { Metadata } from "next";
import React from 'react'
import SearchPageComponent from "@/components/search/SearchPageComponent";
import FilterProviders from "@/providers/FilterProviders";
import { withCanonical } from '@/lib/seo/metadata';

const searchMetadata: Metadata = {
  title: "Catalogue des biens immobiliers - Trouve Ton Nkama",
  description: "Explorez notre catalogue des biens immobiliers à louer ou à vendre partout au Gabon. Recherchez facilement des maisons, appartements, studios et plus encore.",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const hasAnyFilter = Object.entries(resolvedSearchParams).some(([, value]) => {
    if (Array.isArray(value)) {
      return value.some((item) => Boolean(item));
    }

    return Boolean(value);
  });

  const metadata = withCanonical(searchMetadata, '/search');

  if (!hasAnyFilter) {
    return metadata;
  }

  return {
    ...metadata,
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function page() {
  return (
    <FilterProviders>
      <SearchPageComponent />
    </FilterProviders>
  )
}
