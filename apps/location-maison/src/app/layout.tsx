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
  title: 'Trouve Ton Nkama - Immobilier Libreville, Port-Gentil, Gabon | Location & Vente',
  description: 'Trouvez votre logement au Gabon : maisons, appartements, villas à Libreville, Port-Gentil, Akanda. Publiez vos annonces immobilières gratuitement. Prix en FCFA, photos réelles, contact direct propriétaire.',
  keywords: 'immobilier Gabon, location maison Libreville, vente appartement Port-Gentil, villa Akanda, terrain Gabon, prix immobilier Libreville, agence immobilière Gabon, logement étudiant Libreville, maison meublée Gabon, appartement centre-ville Libreville, location courte durée Gabon, investissement immobilier Libreville, quartier résidentiel Port-Gentil, maison sous barrière Gabon, studio étudiant Libreville',
  metadataBase: new URL('https://www.tonnkama.com'),
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
    title: 'Immobilier Gabon - Trouve Ton Nkama | Location & Vente Libreville, Port-Gentil',
    description: 'Plateforme immobilière #1 au Gabon. Maisons, appartements, villas à Libreville, Port-Gentil, Akanda. Prix en FCFA, annonces vérifiées, contact direct propriétaire. Publiez gratuitement vos annonces.',
    url: 'https://www.tonnkama.com',
    siteName: 'Trouve Ton Nkama - Immobilier Gabon',
    images: [
      {
        url: 'https://www.tonnkama.com/linkedin-og.jpg?v=1',
        width: 1200,
        height: 630,
        alt: 'Trouve Ton Nkama Accueil',
      },
      {
        url: 'https://www.tonnkama.com/og-image.jpg?v=2',
        width: 1200,
        height: 630,
        alt: 'Trouve Ton Nkama Accueil',
      },
      {
        url: 'https://www.tonnkama.com/og-image.png?v=3',
        width: 1200,
        height: 630,
        alt: 'Trouve Ton Nkama Accueil',
      }
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Immobilier Gabon - Trouve Ton Nkama | Libreville, Port-Gentil',
    description: 'Trouvez votre logement au Gabon : maisons, appartements, villas. Prix en FCFA, annonces vérifiées, contact direct propriétaire.',
    images: ['/og-image.png'],
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
        <link rel="canonical" href="https://www.tonnkama.com/" />
        
        {/* Schema.org - Local Business */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "RealEstateAgent",
              "name": "Trouve Ton Nkama",
              "description": "Plateforme immobilière de référence au Gabon. Location et vente de maisons, appartements, villas à Libreville, Port-Gentil, Akanda.",
              "url": "https://www.tonnkama.com",
              "logo": "https://www.tonnkama.com/logo.webp",
              "image": "https://www.tonnkama.com/og-image.jpg",
              "telephone": "+24101234567",
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
                  "name": "Akanda", 
                  "addressRegion": "Estuaire",
                  "addressCountry": "GA"
                }
              ],
              "serviceType": ["Location immobilière", "Vente immobilière", "Gestion locative"],
              "priceRange": "$$",
              "openingHours": "Mo-Su 00:00-23:59",
              "sameAs": [
                "https://www.facebook.com/tonnkama",
                "https://www.linkedin.com/company/tonnkama"
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
              "url": "https://www.tonnkama.com",
              "description": "Plateforme immobilière Gabon - Location et vente de logements",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.tonnkama.com/search?query={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        
        {/* Métadonnées spécifiques pour LinkedIn */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content="Trouve Ton Nkama - Plateforme immobilière au Gabon" />
        
        {/* Métadonnées supplémentaires pour une meilleure compatibilité */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Trouve Ton Nkama" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:image:secure_url" content="https://www.tonnkama.com/og-image.jpg" />
        
        {/* Métadonnées spécifiques LinkedIn */}
        <meta property="og:image" content="https://www.tonnkama.com/linkedin-og.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
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
