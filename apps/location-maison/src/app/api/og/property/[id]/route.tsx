import { ImageResponse } from 'next/og'
import { getPublicPropertyById } from '@/lib/seo/public-listings'
import { getPrimaryPropertyImageUrl } from '@/lib/property-images'
import { formatListingPrice, getListingLocationLabel, getListingStatusLabel } from '@/lib/seo/listing-share'

// Runtime Node.js par défaut (pas 'edge') : getPublicPropertyById utilise firebase-admin, qui
// dépend d'API Node (crypto, net) indisponibles sur l'edge runtime.
const FALLBACK_IMAGE_URL = `${process.env.NEXT_PUBLIC_HOST}/assets/og_img.png`

/**
 * Image de partage (og:image) d'une annonce : photo pleine page + bandeau prix/quartier en
 * superposition (dégradé sombre pour rester lisible sur n'importe quelle photo). Route API
 * explicite plutôt que la convention de fichier `opengraph-image.tsx` : cette dernière est
 * ignorée par Next dès que `generateMetadata` définit lui-même `openGraph.images` (ce qui est
 * le cas ici, voir page.tsx) — l'URL de cette route y est passée explicitement à la place.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Admin SDK, filtre déjà state=IN_PROGRESS + moderationStatus=APPROVED : pas de fuite
  // d'annonce non approuvée sur cette route publique (pas d'auth ici, /api est hors middleware).
  const property = await getPublicPropertyById(id)
  const imageURL = getPrimaryPropertyImageUrl(property?.images) ?? FALLBACK_IMAGE_URL

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: 'white',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageURL}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            inset: 0,
          }}
        />

        {property && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '40px 56px 48px',
              background: 'linear-gradient(0deg, rgba(2,8,23,0.92) 0%, rgba(2,8,23,0.55) 55%, rgba(2,8,23,0) 100%)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                background: 'linear-gradient(90deg, #146B67 0%, #1FA89B 100%)',
                color: 'white',
                fontSize: 26,
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: 999,
              }}
            >
              {getListingStatusLabel(property.status)}
            </div>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: 'white', lineHeight: 1.05 }}>
              {formatListingPrice(property)}
            </div>
            <div style={{ display: 'flex', fontSize: 34, color: 'rgba(255,255,255,0.85)' }}>
              {getListingLocationLabel(property)}
            </div>
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
