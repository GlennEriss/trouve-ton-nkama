// Simuler l'environnement
process.env.NEXT_PUBLIC_HOST = 'https://www.tonnkama.com';

// Routes simulées
const routes = {
  public_google: {
    homePage: '/',
    confidentiality: '/privacy-policy',
    terms_of_use: '/terms-of-use',
  }
};

function generateSitemap() {
  const rawBase = process.env.NEXT_PUBLIC_HOST ?? '';
  const baseUrl = rawBase.replace(/\/$/, '');

  // Vérifier que l'URL de base est valide
  if (!baseUrl || !baseUrl.startsWith('http')) {
    console.error('❌ NEXT_PUBLIC_HOST invalide:', process.env.NEXT_PUBLIC_HOST);
    return null;
  }

  // Tableau ordonné : home d'abord, puis les autres
  const pages = [
    routes.public_google.homePage,          
    routes.public_google.confidentiality,
    routes.public_google.terms_of_use,    
  ];

  const todayISO = new Date().toISOString();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((path, idx) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${todayISO}</lastmod>${idx === 0 ? '\n    <priority>1.0</priority>' : ''}
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
}

function validateSitemap(sitemap) {
  console.log('🔍 Validation du sitemap...\n');
  
  // Vérifications de base
  const checks = [
    {
      name: 'Déclaration XML',
      test: sitemap.includes('<?xml version="1.0" encoding="UTF-8"?>'),
      error: 'Manque la déclaration XML'
    },
    {
      name: 'Namespace urlset',
      test: sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
      error: 'Namespace urlset manquant'
    },
    {
      name: 'Balises url',
      test: (sitemap.match(/<url>/g) || []).length > 0,
      error: 'Aucune balise <url> trouvée'
    },
    {
      name: 'Balises loc',
      test: (sitemap.match(/<loc>/g) || []).length > 0,
      error: 'Aucune balise <loc> trouvée'
    },
    {
      name: 'Balises lastmod',
      test: (sitemap.match(/<lastmod>/g) || []).length > 0,
      error: 'Aucune balise <lastmod> trouvée'
    },
    {
      name: 'URLs valides',
      test: sitemap.includes('https://www.tonnkama.com'),
      error: 'URLs invalides'
    },
    {
      name: 'Format ISO date',
      test: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(sitemap),
      error: 'Format de date invalide'
    },
    {
      name: 'Structure XML valide',
      test: sitemap.includes('</urlset>') && sitemap.includes('</url>'),
      error: 'Structure XML invalide'
    }
  ];

  let allPassed = true;
  
  checks.forEach(check => {
    const status = check.test ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    if (!check.test) {
      console.log(`   Erreur: ${check.error}`);
      allPassed = false;
    }
  });

  return allPassed;
}

function displaySitemap(sitemap) {
  console.log('\n📄 Sitemap généré:\n');
  console.log(sitemap);
  console.log('\n' + '='.repeat(50));
}

// Test principal
console.log('🧪 Test du générateur de sitemap\n');

const sitemap = generateSitemap();

if (!sitemap) {
  console.log('❌ Impossible de générer le sitemap');
  process.exit(1);
}

const isValid = validateSitemap(sitemap);

if (isValid) {
  console.log('\n✅ Sitemap valide !');
  displaySitemap(sitemap);
} else {
  console.log('\n❌ Sitemap invalide - corrections nécessaires');
  displaySitemap(sitemap);
  process.exit(1);
} 