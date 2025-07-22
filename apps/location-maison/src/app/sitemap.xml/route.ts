import { routes } from '@/constantes/routes'

export async function GET() {
  const rawBase = process.env.NEXT_PUBLIC_HOST ?? ''
  const baseUrl = rawBase.replace(/\/$/, '')

  // Vérifier que l'URL de base est valide
  if (!baseUrl || !baseUrl.startsWith('http')) {
    console.error('NEXT_PUBLIC_HOST invalide:', process.env.NEXT_PUBLIC_HOST)
    return new Response('Sitemap non disponible', { status: 500 })
  }

  // Tableau ordonné : home d'abord, puis les autres
  const pages = [
    routes.public_google.homePage,          
    routes.public_google.search,
    routes.public_google.blog,
    routes.public_google.blog_tendances_marche,
    routes.public_google.blog_financement,
    routes.public_google.blog_commissions_demarcheurs,
    routes.public_google.blog_structurer_annonces,
    routes.public_google.blog_proptech,
    // Nouvelles pages de blog ajoutées
    routes.public_google.blog_guide_quartiers_libreville,
    routes.public_google.blog_guide_quartiers_port_gentil,
    routes.public_google.blog_rentabilite_immobiliere,
    routes.public_google.blog_actualites_immobilieres,
    routes.public_google.blog_conseils_negociation,
    routes.public_google.blog_demarches_administratives,
    routes.public_google.guide_immobilier_gabon,
    routes.public_google.confidentiality,
    routes.public_google.terms_of_use,    
    routes.public.data_deletion,    
    routes.public.signin,
    routes.public.signup,
    routes.public.property,
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
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
