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
  title: 'Trouve Ton Nkama - Trouvez ou publiez un logement au Gabon',
  description: 'Découvrez les meilleures annonces immobilières au Gabon. Louez ou vendez votre logement facilement avec Trouve Ton Nkama.',
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
    title: 'Trouve Ton Nkama - Immobilier au Gabon',
    description: 'Explorez un large choix de logements à louer ou à vendre au Gabon. Publiez vos annonces ou trouvez votre futur chez-vous avec Trouve Ton Nkama.',
    url: 'https://www.tonnkama.com',
    siteName: 'Trouve Ton Nkama',
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
    title: 'Trouve Ton Nkama - Immobilier au Gabon',
    description: 'Explorez un large choix de logements à louer ou à vendre au Gabon. Publiez vos annonces ou trouvez votre futur chez-vous avec Trouve Ton Nkama.',
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
