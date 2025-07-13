import { getPropertyById } from '@/db/property.db'
import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Image generation
export default async function Image({ params }: { params: { id: string } }) {
  const post = await getPropertyById(params.id)
  const imageURL = post?.images?.[0]?.fileURL ?? process.env.NEXT_PUBLIC_HOST+'/assets/og_img.png'
  const title = post?.title ?? 'Découvrez une annonce immobilière sur Trouve Ton Nkama'

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={imageURL}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  )
}