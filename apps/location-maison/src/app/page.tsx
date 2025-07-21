import React from "react";
import type { Metadata } from "next";
import HomePageComponent from "@/components/home-page/HomePageComponent";

export const metadata: Metadata = {
    title: "Trouve Ton Nkama - Trouvez ou publiez un logement au Gabon",
    description: "Découvrez les meilleures annonces immobilières au Gabon. Louez ou vendez votre logement facilement avec Trouve Ton Nkama.",
    openGraph: {
        title: "Trouve Ton Nkama - Immobilier au Gabon",
        description: "Explorez un large choix de logements à louer ou à vendre au Gabon. Publiez vos annonces ou trouvez votre futur chez-vous avec Trouve Ton Nkama.",
        url: `${process.env.NEXT_PUBLIC_HOST}`,
        type: "website",
        images: [
            {
                url: `${process.env.NEXT_PUBLIC_HOST}/linkedin-og.jpg`,
                width: 1200,
                height: 630,
                alt: "Trouve Ton Nkama Accueil",
            },
            {
                url: `${process.env.NEXT_PUBLIC_HOST}/og-image.jpg`,
                width: 1200,
                height: 630,
                alt: "Trouve Ton Nkama Accueil",
            },
        ],
    },
};

export default async function Home() {
    return (
        <HomePageComponent />
    )
}