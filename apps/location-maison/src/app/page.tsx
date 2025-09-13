import React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import HomePageComponent from "@/components/home-page/HomePageComponent";

export const metadata: Metadata = {
    title: "Immobilier Gabon - Trouve Ton Nkama | Location & Vente Maisons, Appartements Libreville",
    description: "Trouvez votre logement au Gabon : maisons, appartements, villas à Libreville, Port-Gentil, Franceville. Prix en FCFA, annonces vérifiées, contact direct propriétaire. Publiez gratuitement vos annonces immobilières.",
    keywords: "immobilier Gabon, location maison Libreville, vente appartement Port-Gentil, villa Akanda, terrain Gabon, prix immobilier Libreville, agence immobilière Gabon, logement étudiant Libreville, maison meublée Gabon, appartement centre-ville Libreville, location courte durée Gabon, investissement immobilier Libreville, quartier résidentiel Port-Gentil, maison sous barrière Gabon, studio étudiant Libreville",
    alternates: {
        canonical: process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
};

export default async function Home() {
    return (
        <>
            <Script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2799688336707362"
                crossOrigin="anonymous"
                strategy="afterInteractive"
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "Trouve Ton Nkama",
                        "description": "Plateforme immobilière de référence au Gabon. Location et vente de maisons, appartements, villas à Libreville, Port-Gentil, Franceville.",
                        "url": process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com',
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": {
                                "@type": "EntryPoint",
                                "urlTemplate": `${process.env.NEXT_PUBLIC_HOST || 'https://www.tonnkama.com'}/search?q={search_term_string}`
                            },
                            "query-input": "required name=search_term_string"
                        },
                        "sameAs": [
                            "https://www.facebook.com/tonnkama",
                            "https://www.instagram.com/tonnkama"
                        ]
                    })
                }}
            />
            <HomePageComponent />
        </>
    )
}