import { routes } from '@/constantes/routes'

export async function GET() {
  const rawBase = process.env.NEXT_PUBLIC_HOST ?? ''
  const baseUrl  = rawBase.replace(/\/$/, '')

  // Tableau ordonné : home d’abord, puis les autres
  const pages = [
    routes.public_google.homePage,          
    routes.public_google.confidentiality,
    routes.public_google.terms_of_use,    
    routes.public_google.search,  
  ]

  const todayISO = new Date().toISOString()

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((path, idx) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${todayISO}</lastmod>${idx === 0 ? '\n    <priority>1.0</priority>' : ''}
  </url>`).join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
