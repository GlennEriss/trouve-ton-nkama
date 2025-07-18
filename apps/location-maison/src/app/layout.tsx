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
      { url: '/favicon.ico' },
      { url: '/logo.svg', type: 'image/svg+xml' }
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
        url: '/logo.webp',
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
    images: ['/logo.webp'],
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
