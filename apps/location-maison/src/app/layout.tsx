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
        <meta name="google-site-verification" content="RJWLkFimD2EEl5ocQ9ZmhdfjCg4CKWW19qwKFUSu8b8" />
        <meta name="google-site-verification" content="srCtEUJLseTnipvVuamNBCo59HLskS-iUAGuSxvg2ek" />
        <meta name="google-adsense-account" content="ca-pub-2799688336707362" />
        <link rel="canonical" href="https://www.tonnkama.com" />
        <link rel="icon" type="image/x-icon" href="/logo.ico" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="apple-touch-icon" href="/logo.ico" />
        <link rel="shortcut icon" href="/logo.ico" />
        <link rel="icon" sizes="16x16" href="/logo.ico" />
        <link rel="icon" sizes="32x32" href="/logo.ico" />
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
