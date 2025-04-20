import { routes } from '@/constantes/routes'

export async function GET() {
  const baseUrl = 'https://location-maison-gabon.vercel.app'

  const pages = [
    ...Object.values(routes.public),
    ...Object.values(routes.protected),
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (path) => `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`
    )
    .join('')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}