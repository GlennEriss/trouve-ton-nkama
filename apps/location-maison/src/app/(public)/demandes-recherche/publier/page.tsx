import type { Metadata } from "next";
import SearchRequestForm, { SearchRequestFormPrefill } from "@/components/search-requests/SearchRequestForm";
import type { TypePropertyKey } from "@trouve-ton-nkama/core/domain";
import { TypePropertyEnum } from "@/constantes/property-type";

// Page transactionnelle (formulaire + paiement) : volontairement absente de
// routes.public_google, contrairement à /demandes-recherche (la liste).
export const metadata: Metadata = {
  title: "Publier ma recherche - Trouve Ton Nkama",
  robots: { index: false, follow: false },
};

function parseTypeProperty(value?: string): TypePropertyKey | undefined {
  return value && value in TypePropertyEnum ? (value as TypePropertyKey) : undefined;
}

function parseNumber(value?: string): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function PublishSearchRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const prefill: SearchRequestFormPrefill = {
    typeProperty: parseTypeProperty(get("type")),
    city: get("city"),
    budgetMinXaf: parseNumber(get("budgetMin")),
    budgetMaxXaf: parseNumber(get("budgetMax")),
  };

  return <SearchRequestForm prefill={prefill} />;
}
