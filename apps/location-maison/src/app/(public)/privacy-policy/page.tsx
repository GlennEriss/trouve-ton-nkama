import PrivacyPolicyClientPage from "@/components/privacy-policy/PrivacyPolicyClientPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Politique de confidentialité - LogisGabon",
  description: "Consultez notre politique de confidentialité pour comprendre comment LogisGabon collecte, utilise et protège vos données personnelles.",
  openGraph: {
    title: "Politique de confidentialité - LogisGabon",
    description: "Apprenez comment LogisGabon respecte votre vie privée et protège vos informations personnelles conformément aux réglementations en vigueur.",
    url: `${process.env.NEXT_PUBLIC_HOST}/privacy-policy`,
    type: "website",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/logo.png`,
        width: 1200,
        height: 630,
        alt: "Politique de confidentialité LogisGabon",
      },
    ],
  },
};

export default function PrivacyPolicy() {
  return (
    <PrivacyPolicyClientPage />
  )
}