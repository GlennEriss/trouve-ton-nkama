import DataDeletionClientPage from "@/components/data-deletion/DataDeletionClientPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Suppression de vos données personnelles - LogisGabon',
  description: "Découvrez comment LogisGabon protège vos données personnelles. Consultez notre charte pour comprendre vos droits de suppression et de gestion de vos informations personnelles.",
  openGraph: {
    title: 'Charte de suppression des données - LogisGabon',
    description: "Consultez notre politique concernant la suppression de vos données personnelles. LogisGabon s'engage à respecter votre vie privée et vos droits.",
    url: `${process.env.NEXT_PUBLIC_HOST}/charte-suppression-donnees`,
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.png`,
        width: 1200,
        height: 630,
        alt: 'Suppression Données LogisGabon',
      },
    ],
  },
};

export default function DataDeletionPage() {
  return (
    <DataDeletionClientPage/>
  )
}