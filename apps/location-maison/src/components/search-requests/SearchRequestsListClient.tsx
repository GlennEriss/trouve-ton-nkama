"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, Filter } from "lucide-react";
import { routes } from "@/constantes/routes";
import { GABON_PROVINCES } from "@/constantes/gabon-locations";
import { TypeProperty, TypePropertyEnum } from "@/constantes/property-type";
import type { TypePropertyKey } from "@trouve-ton-nkama/core/domain";
import { getBoostedSearchRequests, getSearchRequests } from "@/db/search-request.db";
import type { SearchRequest } from "@/models/search-request";
import SearchRequestCard from "@/components/search-requests/SearchRequestCard";
import { Button } from "@trouve-ton-nkama/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@trouve-ton-nkama/ui/sheet";

const PAGE_SIZE = 24;

export default function SearchRequestsListClient() {
  const [boosted, setBoosted] = useState<SearchRequest[]>([]);
  const [items, setItems] = useState<SearchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeProperty, setTypeProperty] = useState<TypePropertyKey | "">("");
  const [transactionType, setTransactionType] = useState<"FOR_RENT" | "FOR_SALE" | "">("");
  const [city, setCity] = useState("");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

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

  const hasActiveFilters = Boolean(typeProperty || transactionType || city);

  const resetFilters = () => {
    setTypeProperty("");
    setTransactionType("");
    setCity("");
  };

  // Rendu une fois pour le bloc desktop (toujours visible) et une fois dans le Sheet mobile
  // (toujours dans le DOM, seul le CSS bascule lequel des deux s'affiche) — idPrefix distingue
  // les deux jeux d'ids, même convention que renderFilterFields dans AdManagementPage.tsx.
  function renderFilterFields(idPrefix: string) {
    return (
      <>
        <select
          id={`${idPrefix}type-property`}
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
          id={`${idPrefix}transaction-type`}
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value as "FOR_RENT" | "FOR_SALE" | "")}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="">Location ou vente</option>
          <option value="FOR_RENT">Location</option>
          <option value="FOR_SALE">Vente</option>
        </select>
        <select
          id={`${idPrefix}city`}
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
      </>
    );
  }

  // Bouton "Filtres" mobile — plusieurs emplacements possibles selon ce qui s'affiche
  // (à côté de "Toutes les demandes", ou dans l'état vide) : un simple bouton contrôlé par
  // isFilterSheetOpen plutôt qu'un SheetTrigger, pour ne pas dépendre d'être un descendant
  // direct de <Sheet> à chaque emplacement — un seul <Sheet> plus bas reste la seule source de
  // vérité de l'ouverture.
  function renderFilterTriggerButton() {
    return (
      <button
        type="button"
        aria-label="Filtres"
        onClick={() => setIsFilterSheetOpen(true)}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 sm:hidden"
      >
        <Filter className="h-5 w-5" />
        {hasActiveFilters && (
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-secondary" aria-hidden />
        )}
      </button>
    );
  }

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

      {/* Desktop : les 3 filtres alignés directement, assez de place. Sur mobile, alignés de
          la même façon ils prenaient trop de place (signalé par l'utilisateur) — repliés dans
          un Sheet, même convention que AdManagementPage.tsx/MyReelsClient.tsx (panneau du bas
          avec Réinitialiser/Voir les résultats). Le bouton qui l'ouvre n'est pas ici : demandé
          sur la même ligne que le titre "Toutes les demandes" plus bas (et dans l'état vide, pour
          ne pas laisser les filtres inaccessibles quand cette section ne s'affiche pas). */}
      <section className="hidden flex-wrap items-center justify-center gap-3 sm:flex">
        {renderFilterFields("")}
      </section>

      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="bottom" className="flex h-[70vh] flex-col rounded-t-2xl px-4 pb-4">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            {renderFilterFields("mobile-")}
          </div>
          <SheetFooter className="flex-row gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/70 dark:hover:bg-gray-800"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Réinitialiser
            </Button>
            <SheetClose asChild>
              <Button className="h-12 flex-1 rounded-full bg-secondary hover:bg-primary-600">
                Voir les résultats
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {loading && <p className="text-center text-sm text-gray-500">Chargement...</p>}

      {/* Le bouton Filtres doit rester accessible dès que "Toutes les demandes" ne s'affiche
          plus (items vide) — même si des demandes boostées existent encore par ailleurs (elles
          ignorent volontairement les filtres, voir getBoostedSearchRequests). Sans ce
          découplage, un filtre qui ne laisse que des demandes boostées faisait disparaître le
          bouton (ni ce bloc ni "Toutes les demandes" ne s'affichaient) — trouvé en écrivant le
          premier e2e réel de ce filtre combiné. */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-3">
          {boosted.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              Aucune demande de recherche pour ces critères pour le moment.
            </p>
          )}
          {renderFilterTriggerButton()}
        </div>
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink dark:text-white">Toutes les demandes</h2>
            {renderFilterTriggerButton()}
          </div>
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
