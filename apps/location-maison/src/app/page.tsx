import React from "react";
import type { Metadata } from "next";
import HomePageComponent from "@/components/home-page/HomePageComponent";

export const metadata: Metadata = {
    title: "LogisGabon - Trouvez ou publiez un logement au Gabon",
    description: "Découvrez les meilleures annonces immobilières au Gabon. Louez ou vendez votre logement facilement avec LogisGabon.",
    openGraph: {
        title: "LogisGabon - Immobilier au Gabon",
        description: "Explorez un large choix de logements à louer ou à vendre au Gabon. Publiez vos annonces ou trouvez votre futur chez-vous avec LogisGabon.",
        url: `${process.env.NEXT_PUBLIC_HOST}`,
        type: "website",
        images: [
            {
                url: `${process.env.NEXT_PUBLIC_HOST}/logo.png`,
                width: 1200,
                height: 630,
                alt: "LogisGabon Accueil",
            },
        ],
    },
};

export default async function Home() {
    return (
        <HomePageComponent />
    )
}