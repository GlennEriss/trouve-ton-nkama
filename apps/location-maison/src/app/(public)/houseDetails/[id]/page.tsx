import { permanentRedirect } from 'next/navigation';

/**
 * `/houseDetails/[id]` est l'ancienne route canonique de la fiche annonce, remplacée par
 * `/annonce/[id]` (multi-catégories, voir docs/marketplace-multi-categories/04-page-detail.md).
 * Cette route reste en place INDÉFINIMENT — pas une étape de migration, un alias permanent —
 * car des mois de liens WhatsApp/Facebook partagés et de résultats de recherche indexés
 * pointent encore vers `/houseDetails/<id>`. `permanentRedirect` émet un 308 (équivalent SEO
 * du 301), traité par les moteurs de recherche comme un transfert d'autorité définitif.
 */
type HouseDetailsParams = Promise<{ id: string }>;
type HouseDetailsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({
  params,
  searchParams,
}: {
  params: HouseDetailsParams;
  searchParams: HouseDetailsSearchParams;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === 'string') {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    }
  }

  const queryString = query.toString();
  permanentRedirect(`/annonce/${id}${queryString ? `?${queryString}` : ''}`);
}
