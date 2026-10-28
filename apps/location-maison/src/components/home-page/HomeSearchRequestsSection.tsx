"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getSearchRequests } from "@/db/search-request.db";
import SearchRequestCard from "@/components/search-requests/SearchRequestCard";

export default function HomeSearchRequestsSection() {
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["home-search-requests", 4],
    queryFn: () => getSearchRequests({ limitPerPage: 4, lastDoc: null }),
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <section aria-labelledby="home-search-requests-title" className="mx-5 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-search-requests-title" className="text-xl lg:text-2xl xl:text-3xl font-bold text-primary">
          Demandes de recherche
        </h2>
        <Link href="/demandes-recherche" className="inline-flex min-h-11 items-center rounded-lg px-4 text-primary font-semibold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          Voir tout<span className="sr-only"> : demandes de recherche</span>
        </Link>
      </div>
      {isPending ? (
        <p role="status">Chargement des demandes de recherche…</p>
      ) : isError ? (
        <div role="alert">
          <p>Impossible de charger les demandes de recherche.</p>
          <button type="button" onClick={() => void refetch()} disabled={isFetching} className="min-h-11 px-4 text-primary underline disabled:opacity-50">
            {isFetching ? "Chargement…" : "Réessayer"}
          </button>
        </div>
      ) : data?.searchRequests.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {data.searchRequests.map((item) => <SearchRequestCard key={item.id} item={item} />)}
        </div>
      ) : (
        <p>Aucune demande de recherche disponible pour le moment.</p>
      )}
    </section>
  );
}
