import React from "react";
import type { Metadata } from "next";
import HomePageComponent from "@/components/home-page/HomePageComponent";

export const metadata: Metadata = {
    title: "Trouve Ton Nkama - Trouvez ou publiez un logement au Gabon",
    description: "Découvrez les meilleures annonces immobilières au Gabon. Louez ou vendez votre logement facilement avec Trouve Ton Nkama.",
};

export default async function Home() {
    return (
        <HomePageComponent />
    )
}