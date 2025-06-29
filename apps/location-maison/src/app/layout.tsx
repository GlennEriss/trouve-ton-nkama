import React from 'react'
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { BottomNavigation } from "@/components/shared/BottomNavigation";
import Footer from "@/components/footer/Footer";
import { cn } from "@/lib/utils";

/* const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LogisGabon",
  description: "Découvrez LogisGabon, la plateforme immobilière gabonaise qui facilite la location, la vente et l'achat de biens. Trouvez facilement votre logement idéal partout au Gabon.",
}; */

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
      </head>
      <body
        className={cn('antialiased overscroll-y-none', inter.className)}
      >
        <Providers>
          {children}
          <BottomNavigation />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
