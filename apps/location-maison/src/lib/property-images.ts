import type { Image as PropertyImage } from '@/models/annonce'

type MaybePropertyImage = Partial<PropertyImage> | string | null | undefined

export function getPropertyImageUrls(images?: MaybePropertyImage[] | null): string[] {
  if (!Array.isArray(images)) return []

  return images
    .map((image) => (typeof image === 'string' ? image : image?.fileURL))
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
}

export function getPrimaryPropertyImageUrl(images?: MaybePropertyImage[] | null): string | undefined {
  return getPropertyImageUrls(images)[0]
}

/**
 * URL à utiliser dans un contexte liste (carte de recherche, favoris, gestion des annonces) :
 * la vignette basse résolution si elle existe, sinon l'image pleine résolution (annonces
 * publiées avant l'introduction des vignettes n'en ont pas).
 */
export function resolveThumbnailUrl(image: MaybePropertyImage): string | undefined {
  if (typeof image === 'string') return image
  const url = image?.thumbURL ?? image?.fileURL
  return typeof url === 'string' && url.trim().length > 0 ? url : undefined
}
