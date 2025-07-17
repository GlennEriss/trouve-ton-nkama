import { Metadata } from "next";
import TermsOfUseClientPage from "./TermsOfUseClientPage"

export const metadata: Metadata = {
  title: "Conditions d'utilisation - Trouve Ton Nkama",
  description: "Lisez les conditions d'utilisation de Trouve Ton Nkama pour comprendre vos droits et responsabilités lors de l'utilisation de notre plateforme immobilière.",
  openGraph: {
    title: "Conditions d'utilisation - Trouve Ton Nkama",
    description: "Prenez connaissance des règles et obligations applicables lors de l’utilisation du site Trouve Ton Nkama, votre plateforme de référence pour l'immobilier au Gabon.",
    url: `${process.env.NEXT_PUBLIC_HOST}/terms-of-use`,
    type: "website",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.webp`,
        width: 1200,
        height: 630,
        alt: "Conditions d'utilisation Trouve Ton Nkama",
      },
    ],
  },
};
export default function TermsOfUsePage() {
  return (
    <TermsOfUseClientPage />
  )
}