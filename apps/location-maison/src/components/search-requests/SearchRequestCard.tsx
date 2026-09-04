"use client";

import { Sparkles, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TypeProperty } from "@/constantes/property-type";
import { toWaMeDigits } from "@/lib/phone/gabon-whatsapp";
import type { SearchRequest } from "@/models/search-request";

function isCurrentlyBoosted(item: SearchRequest): boolean {
  if (!item.boostEndAt) return false;
  const endMillis =
    typeof (item.boostEndAt as any).toMillis === "function"
      ? (item.boostEndAt as any).toMillis()
      : new Date(item.boostEndAt as unknown as string).getTime();
  return endMillis > Date.now();
}

export default function SearchRequestCard({ item }: { item: SearchRequest }) {
  const boosted = isCurrentlyBoosted(item);
  const whatsappMessage = `Bonjour, j'ai vu votre demande de recherche sur Trouve Ton Nkama (${TypeProperty[item.typeProperty]} à ${item.city}). J'ai peut-être ce qu'il vous faut.`;
  // wa.me exige l'indicatif pays sans "0" initial (ex: 24162459646). Passe par toWaMeDigits
  // plutôt que d'utiliser item.whatsappContact tel quel : le champ était jusqu'ici stocké au
  // format local ("062459646"), ce qui rendait ce lien non fonctionnel pour toute demande
  // existante — corrigé ici sans dépendre d'une migration des données déjà en base.
  const whatsappLink = `https://wa.me/${toWaMeDigits(item.whatsappContact)}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div
      className={cn(
        "h-full rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 dark:border-gray-700 flex flex-col",
        boosted && "ring-2 ring-amber-400/90 border-amber-300",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary dark:text-blue-300">
          {TypeProperty[item.typeProperty]}
        </span>
        {boosted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
            <Sparkles className="h-3.5 w-3.5" />
            Recherche urgente
          </span>
        )}
      </div>

      <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
        {item.transactionType === "FOR_RENT" ? "Cherche à louer" : "Cherche à acheter"} — {item.city}
        {item.neighborhood ? `, ${item.neighborhood}` : ""}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{item.province}</p>

      <p className="mt-2 text-base font-bold text-primary dark:text-blue-300">
        Budget : {item.budgetMinXaf.toLocaleString("fr-FR")} - {item.budgetMaxXaf.toLocaleString("fr-FR")} FCFA
      </p>

      <p className="mt-3 flex-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-4">{item.description}</p>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
      >
        <MessageCircle className="h-4 w-4" />
        Contacter sur WhatsApp
      </a>
    </div>
  );
}
