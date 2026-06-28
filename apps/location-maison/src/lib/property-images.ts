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
