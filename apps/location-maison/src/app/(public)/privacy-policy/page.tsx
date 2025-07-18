import PrivacyPolicyClientPage from "@/components/privacy-policy/PrivacyPolicyClientPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Trouve Ton Nkama",
  description: "Consultez notre politique de confidentialité pour comprendre comment Trouve Ton Nkama collecte, utilise et protège vos données personnelles.",
  openGraph: {
    title: "Politique de confidentialité - Trouve Ton Nkama",
    description: "Apprenez comment Trouve Ton Nkama respecte votre vie privée et protège vos informations personnelles conformément aux réglementations en vigueur.",
    url: `${process.env.NEXT_PUBLIC_HOST}/privacy-policy`,
    type: "website",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.svg`,
        width: 1200,
        height: 630,
        alt: "Politique de confidentialité Trouve Ton Nkama",
      },
    ],
  },
};

export default function PrivacyPolicy() {
  return (
    <PrivacyPolicyClientPage />
  )
}