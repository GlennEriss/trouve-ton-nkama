import DataDeletionClientPage from "@/components/data-deletion/DataDeletionClientPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Suppression de vos données personnelles - Trouve Ton Nkama',
  description: "Découvrez comment Trouve Ton Nkama protège vos données personnelles. Consultez notre charte pour comprendre vos droits de suppression et de gestion de vos informations personnelles.",
  openGraph: {
    title: 'Charte de suppression des données - Trouve Ton Nkama',
    description: "Consultez notre politique concernant la suppression de vos données personnelles. Trouve Ton Nkama s'engage à respecter votre vie privée et vos droits.",
    url: `${process.env.NEXT_PUBLIC_HOST}/charte-suppression-donnees`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.webp`,
        width: 1200,
        height: 630,
        alt: 'Suppression Données Trouve Ton Nkama',
      },
    ],
  },
};

export default function DataDeletionPage() {
  return (
    <DataDeletionClientPage/>
  )
}