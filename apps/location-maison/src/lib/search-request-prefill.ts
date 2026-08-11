import { routes } from "@/constantes/routes";
import { TypePropertyEnum } from "@/constantes/property-type";

/**
 * Construit le lien vers /demandes-recherche/publier pré-rempli à partir des
 * paramètres de recherche déjà saisis sur /search (city, minPrice, maxPrice,
 * typeProperty) — même noms de query params que la synchronisation Algolia
 * dans SearchDesktopPage.tsx/SearchMobilePage.tsx. Le facet Algolia
 * `typeProperty` stocke déjà la clé brute (ex: "Home"), pas le libellé
 * français — voir useAlgoliaFacetOptions.ts (option.value = clé). Réduit la
 * friction : un visiteur qui vient de taper ses critères n'a pas à les
 * ressaisir.
 */
export function buildSearchRequestPrefillUrl(searchParams: URLSearchParams): string {
  const city = searchParams.get("city");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const typePropertyRaw = searchParams.get("typeProperty");
  const firstTypeKey = typePropertyRaw?.split(",")[0]?.trim();
  const typeKey = firstTypeKey && firstTypeKey in TypePropertyEnum ? firstTypeKey : undefined;

  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (minPrice) params.set("budgetMin", minPrice);
  if (maxPrice) params.set("budgetMax", maxPrice);
  if (typeKey) params.set("type", typeKey);

  const query = params.toString();
  return query ? `${routes.public.search_requests_publish}?${query}` : routes.public.search_requests_publish;
}
