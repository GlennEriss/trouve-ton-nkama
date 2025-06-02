import { Metadata } from "next";
import TermsOfUseClientPage from "./TermsOfUseClientPage"

export const metadata: Metadata = {
  title: "Conditions d'utilisation - LogisGabon",
  description: "Lisez les conditions d'utilisation de LogisGabon pour comprendre vos droits et responsabilités lors de l'utilisation de notre plateforme immobilière.",
  openGraph: {
    title: "Conditions d'utilisation - LogisGabon",
    description: "Prenez connaissance des règles et obligations applicables lors de l’utilisation du site LogisGabon, votre plateforme de référence pour l'immobilier au Gabon.",
    url: `${process.env.NEXT_PUBLIC_HOST}/terms-of-use`,
    type: "website",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.png`,
        width: 1200,
        height: 630,
        alt: "Conditions d'utilisation LogisGabon",
      },
    ],
  },
};
export default function TermsOfUsePage() {
  return (
    <TermsOfUseClientPage />
  )
}