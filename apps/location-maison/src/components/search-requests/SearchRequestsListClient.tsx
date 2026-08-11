"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { routes } from "@/constantes/routes";
import { GABON_PROVINCES } from "@/constantes/gabon-locations";
import { TypeProperty, TypePropertyEnum } from "@/constantes/property-type";
import type { TypePropertyKey } from "@trouve-ton-nkama/core/domain";
import { getBoostedSearchRequests, getSearchRequests } from "@/db/search-request.db";
import type { SearchRequest } from "@/models/search-request";
import SearchRequestCard from "@/components/search-requests/SearchRequestCard";

const PAGE_SIZE = 24;

export default function SearchRequestsListClient() {
  const [boosted, setBoosted] = useState<SearchRequest[]>([]);
  const [items, setItems] = useState<SearchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeProperty, setTypeProperty] = useState<TypePropertyKey | "">("");
  const [transactionType, setTransactionType] = useState<"FOR_RENT" | "FOR_SALE" | "">("");
  const [city, setCity] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getBoostedSearchRequests(),
      getSearchRequests({
        limitPerPage: PAGE_SIZE,
        lastDoc: null,
        typeProperty: typeProperty || undefined,
        transactionType: transactionType || undefined,
        city: city.trim() || undefined,
      }),
    ])
      .then(([boostedResult, listResult]) => {
        if (cancelled) return;
        const boostedIds = new Set(boostedResult.map((r) => r.id));
        setBoosted(boostedResult);
        // Évite les doublons : une demande boostée déjà affichée en haut ne
        // réapparaît pas dans le flux normal en dessous.
        setItems(listResult.searchRequests.filter((r) => !boostedIds.has(r.id)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [typeProperty, transactionType, city]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 space-y-8">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2">
          <Search className="w-5 h-5 text-secondary" />
          <span className="font-semibold text-ink">Demandes de recherche</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-ink dark:text-white">
          Ce que nos visiteurs recherchent en ce moment
        </h1>
        <p className="mx-auto max-w-2xl text-gray-600 dark:text-gray-300">
          Des personnes n&apos;ayant pas trouvé leur bonheur sur notre catalogue publient ici
          exactement ce qu&apos;elles cherchent. Vous avez un bien qui correspond ? Contactez-les
          directement sur WhatsApp.
        </p>
        <Link
          href={routes.public.search_requests_publish}
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-primary-600"
        >
          <Plus className="w-5 h-5" />
          Publier ma recherche
        </Link>
      </section>

      <section className="flex flex-wrap items-center justify-center gap-3">
        <select
          value={typeProperty}
          onChange={(e) => setTypeProperty(e.target.value as TypePropertyKey | "")}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="">Tous les types de bien</option>
          {Object.keys(TypePropertyEnum).map((key) => (
            <option key={key} value={key}>
              {TypeProperty[key] ?? key}
            </option>
          ))}
        </select>
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value as "FOR_RENT" | "FOR_SALE" | "")}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="">Location ou vente</option>
          <option value="FOR_RENT">Location</option>
          <option value="FOR_SALE">Vente</option>
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="">Toutes les villes</option>
          {GABON_PROVINCES.map((province) => (
            <option key={province.name} value={province.capital}>
              {province.capital}
            </option>
          ))}
        </select>
      </section>

      {loading && <p className="text-center text-sm text-gray-500">Chargement...</p>}

      {!loading && boosted.length === 0 && items.length === 0 && (
        <p className="text-center text-sm text-gray-500">
          Aucune demande de recherche pour ces critères pour le moment.
        </p>
      )}

      {boosted.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-ink dark:text-white">Recherches urgentes</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {boosted.map((item) => (
              <SearchRequestCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-ink dark:text-white">Toutes les demandes</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <SearchRequestCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
