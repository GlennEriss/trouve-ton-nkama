import React from 'react'
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { BottomNavigation } from "@/components/shared/BottomNavigation";
import Footer from "@/components/footer/Footer";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { Metadata } from 'next'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400'],
})

export const metadata: Metadata = {
  title: 'Trouve Ton Nkama - Immobilier Gabon | Location & Vente Maisons, Appartements',
  description: 'Trouvez votre logement au Gabon : maisons, appartements, villas à Libreville, Port-Gentil, Franceville, Oyem, Mouila et partout au Gabon. Publiez vos annonces immobilières gratuitement. Prix en FCFA, photos réelles, contact direct propriétaire.',
  keywords: 'immobilier Gabon, location maison Libreville, vente appartement Port-Gentil, villa Akanda, terrain Gabon, prix immobilier Libreville, agence immobilière Gabon, logement étudiant Libreville, maison meublée Gabon, appartement centre-ville Libreville, location courte durée Gabon, investissement immobilier Libreville, quartier résidentiel Port-Gentil, maison sous barrière Gabon, studio étudiant Libreville, immobilier Franceville, location maison Franceville, vente appartement Franceville, immobilier Oyem, location maison Oyem, vente appartement Oyem, immobilier Mouila, location maison Mouila, vente appartement Mouila, immobilier Lambaréne, location maison Lambaréne, vente appartement Lambaréne, immobilier Tchibanga, location maison Tchibanga, vente appartement Tchibanga, immobilier Makokou, location maison Makokou, vente appartement Makokou, immobilier Koulamoutou, location maison Koulamoutou, vente appartement Koulamoutou, immobilier Bitam, location maison Bitam, vente appartement Bitam, immobilier Moanda, location maison Moanda, vente appartement Moanda, immobilier Ntoum, location maison Ntoum, vente appartement Ntoum, immobilier Owendo, location maison Owendo, vente appartement Owendo, immobilier Ndjolé, location maison Ndjolé, vente appartement Ndjolé, immobilier Estuaire, immobilier Ogooué-Maritime, immobilier Haut-Ogooué, immobilier Woleu-Ntem, immobilier Ngounié, immobilier Moyen-Ogooué, immobilier Nyanga, immobilier Ogooué-Ivindo, immobilier Ogooué-Lolo',
  metadataBase: new URL(process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'),
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.webp', type: 'image/webp', sizes: '32x32' },
      { url: '/icon-64.webp', type: 'image/webp', sizes: '64x64' },
      { url: '/icon-128.webp', type: 'image/webp', sizes: '128x128' },
      { url: '/icon-256.webp', type: 'image/webp', sizes: '256x256' },
      { url: '/icon-512.webp', type: 'image/webp', sizes: '512x512' },
      { url: '/logo.webp', type: 'image/webp', sizes: '1024x1024' }
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Immobilier Gabon - Trouve Ton Nkama | Location & Vente Maisons, Appartements',
    description: 'Plateforme immobilière #1 au Gabon. Maisons, appartements, villas à Libreville, Port-Gentil, Franceville, Oyem, Mouila et partout au Gabon. Prix en FCFA, annonces vérifiées, contact direct propriétaire. Publiez gratuitement vos annonces.',
    url: process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com',
    siteName: 'Trouve Ton Nkama - Immobilier Gabon',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Trouve Ton Nkama - Plateforme immobilière au Gabon',
        type: 'image/jpeg',
      }
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Immobilier Gabon - Trouve Ton Nkama | Location & Vente',
    description: 'Trouvez votre logement au Gabon : maisons, appartements, villas. Prix en FCFA, annonces vérifiées, contact direct propriétaire.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="owGLe__J-ZZiJvB-iZzlfxianxrwoO8vdRyxKFfSkTk" />
        <meta name="google-adsense-account" content="ca-pub-2799688336707362" />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'}/`} />
        
        {/* Métadonnées Open Graph optimisées pour mobile et WhatsApp */}
        <meta property="og:title" content="Immobilier Gabon - Trouve Ton Nkama | Location & Vente Maisons, Appartements" />
        <meta property="og:description" content="Plateforme immobilière #1 au Gabon. Maisons, appartements, villas à Libreville, Port-Gentil, Franceville, Oyem, Mouila et partout au Gabon. Prix en FCFA, annonces vérifiées, contact direct propriétaire." />
        <meta property="og:url" content={process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Trouve Ton Nkama" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:image" content={`${process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'}/og-image.jpg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:alt" content="Trouve Ton Nkama - Plateforme immobilière au Gabon" />
        <meta property="og:image:secure_url" content={`${process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'}/og-image.jpg`} />
        
        {/* Métadonnées Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Immobilier Gabon - Trouve Ton Nkama | Location & Vente" />
        <meta name="twitter:description" content="Trouvez votre logement au Gabon : maisons, appartements, villas. Prix en FCFA, annonces vérifiées, contact direct propriétaire." />
        <meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'}/og-image.jpg`} />
        
        {/* Schema.org - Local Business */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "RealEstateAgent",
              "name": "Trouve Ton Nkama",
              "description": "Plateforme immobilière de référence au Gabon. Location et vente de maisons, appartements, villas à Libreville, Port-Gentil, Akanda.",
              "url": process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com',
              "logo": `${process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'}/logo.webp`,
              "image": `${process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'}/og-image.jpg`,
              "telephone": "+24166597408",
              "email": "contact@tonnkama.com",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "GA",
                "addressRegion": "Estuaire",
                "addressLocality": "Libreville"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 0.4162,
                "longitude": 9.4673
              },
              "areaServed": [
                {
                  "@type": "City",
                  "name": "Libreville",
                  "addressRegion": "Estuaire",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City", 
                  "name": "Port-Gentil",
                  "addressRegion": "Ogooué-Maritime",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Franceville",
                  "addressRegion": "Haut-Ogooué",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Oyem",
                  "addressRegion": "Woleu-Ntem",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Mouila",
                  "addressRegion": "Ngounié",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Lambaréne",
                  "addressRegion": "Moyen-Ogooué",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Tchibanga",
                  "addressRegion": "Nyanga",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Makokou",
                  "addressRegion": "Ogooué-Ivindo",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Koulamoutou",
                  "addressRegion": "Ogooué-Lolo",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Akanda",
                  "addressRegion": "Estuaire",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Bitam",
                  "addressRegion": "Woleu-Ntem",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Moanda",
                  "addressRegion": "Haut-Ogooué",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Ntoum",
                  "addressRegion": "Estuaire",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Owendo",
                  "addressRegion": "Estuaire",
                  "addressCountry": "GA"
                },
                {
                  "@type": "City",
                  "name": "Ndjolé",
                  "addressRegion": "Moyen-Ogooué",
                  "addressCountry": "GA"
                }
              ],
              "serviceType": ["Location immobilière", "Vente immobilière", "Gestion locative"],
              "priceRange": "$$",
              "openingHours": "Mo-Su 00:00-23:59",
              "sameAs": [
                "https://www.facebook.com/share/16beeh915e/",
                //"https://www.linkedin.com/company/tonnkama"
              ]
            })
          }}
        />
        
        {/* Schema.org - WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Trouve Ton Nkama",
              "url": process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com',
              "description": "Plateforme immobilière Gabon - Location et vente de logements",
              "potentialAction": {
                "@type": "SearchAction",
                "target": `${process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'}/search?query={search_term_string}`,
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4DBEA4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>

      <body
        className={cn('antialiased overscroll-y-none', inter.className)}
      >
        <Providers>
          {children}
          <BottomNavigation />
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
