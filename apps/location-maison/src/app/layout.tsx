import React from 'react'
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { BottomNavigation } from "@/components/shared/BottomNavigation";
import Footer from "@/components/footer/Footer";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ['latin'],
  weight: ['400'],
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="owGLe__J-ZZiJvB-iZzlfxianxrwoO8vdRyxKFfSkTk" />

        <meta name="google-adsense-account" content="ca-pub-2799688336707362" />

        <link rel="canonical" href="https://www.tonnkama.com/" />

        <link rel="icon" href="/favicon.ico" sizes="any" />

        <link rel="icon" type="image/svg+xml" href="/logo.svg"/>

        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
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
