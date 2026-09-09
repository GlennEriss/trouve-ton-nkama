// Miroir de Image (apps/location-maison/src/models/annonce.d.ts:28-33) : { filePATH, fileURL,
// thumbPATH?, thumbURL? } — PAS `imageURL`, une erreur que ListingDetailScreen.tsx avait
// commise (jamais aucune image ne s'affichait, silencieusement, car ce champ n'existe pas).
// L'index Algolia peut aussi contenir une string brute pour certaines annonces plus anciennes
// (voir apps/location-maison/src/lib/seo/algolia-listings.ts:33, format mixte), d'où l'union.
export type PropertyImage = { fileURL?: string; thumbURL?: string } | string;

export function getImageUrl(image?: PropertyImage, preferThumb = false): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return image;
  return (preferThumb ? image.thumbURL : undefined) ?? image.fileURL ?? image.thumbURL;
}
