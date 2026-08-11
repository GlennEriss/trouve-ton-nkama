import type { Metadata } from "next";
import SearchRequestsListClient from "@/components/search-requests/SearchRequestsListClient";

export const metadata: Metadata = {
  title: "Demandes de recherche - Trouve Ton Nkama",
  description:
    "Découvrez ce que recherchent nos visiteurs au Gabon : type de bien, ville, budget. Vous avez un logement qui correspond ? Contactez-les directement sur WhatsApp.",
};

export default function SearchRequestsPage() {
  return <SearchRequestsListClient />;
}
