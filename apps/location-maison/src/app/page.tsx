import React from "react";
import type { Metadata } from "next";
import HomePageComponent from "@/components/home-page/HomePageComponent";
import { withCanonical } from '@/lib/seo/metadata';

const homeMetadata: Metadata = {
    title: "Immobilier Gabon - Trouve Ton Nkama | Location & Vente Maisons, Appartements Libreville",
    description: "Trouvez votre logement au Gabon : maisons, appartements, villas à Libreville, Port-Gentil, Franceville. Prix en FCFA, annonces vérifiées, contact direct propriétaire. Publiez gratuitement vos annonces immobilières.",
    keywords: "immobilier Gabon, location maison Libreville, vente appartement Port-Gentil, villa Akanda, terrain Gabon, prix immobilier Libreville, agence immobilière Gabon, logement étudiant Libreville, maison meublée Gabon, appartement centre-ville Libreville, location courte durée Gabon, investissement immobilier Libreville, quartier résidentiel Port-Gentil, maison sous barrière Gabon, studio étudiant Libreville",
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

export const metadata: Metadata = withCanonical(homeMetadata, '/');

export default async function Home() {
    return (
        <HomePageComponent />
    )
}
