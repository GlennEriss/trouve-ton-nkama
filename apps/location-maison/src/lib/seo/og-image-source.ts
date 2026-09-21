import sharp from 'sharp'

/**
 * `next/og` ne décode pas de façon fiable les WebP distants dans le runtime
 * Node de production. Les uploads historiques sont surtout en JPEG/PNG, mais
 * les imports optimisés utilisent WebP. On ne télécharge et ne convertit donc
 * que ce format ; les formats déjà compatibles gardent leur URL distante.
 */
export function isRemoteWebp(url: string): boolean {
  try {
    return decodeURIComponent(new URL(url).pathname).toLowerCase().endsWith('.webp')
  } catch {
    return false
  }
}

export async function prepareOgImageSource(
  imageUrl: string | undefined,
  fallbackUrl: string,
): Promise<string> {
  if (!imageUrl) return fallbackUrl
  if (!isRemoteWebp(imageUrl)) return imageUrl

  try {
    const response = await fetch(imageUrl, { cache: 'force-cache' })
    if (!response.ok) return fallbackUrl

    const source = Buffer.from(await response.arrayBuffer())
    const png = await sharp(source).png({ compressionLevel: 8 }).toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    // Une image externe ne doit jamais faire tomber tout l'endpoint OG : les
    // robots sociaux doivent toujours recevoir une image valide.
    return fallbackUrl
  }
}
