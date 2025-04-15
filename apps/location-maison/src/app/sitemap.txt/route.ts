import { routes } from '@/constantes/routes'

export async function GET() {
  const baseUrl = 'https://location-maison-gabon.vercel.app'

  const urls = Object.values(routes.public).map(
    (path) => `${baseUrl}${path}`
  )

  const body = urls.join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}