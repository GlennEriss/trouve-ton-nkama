import type { Metadata } from "next";
import React from 'react';
import PrivacyPolicyClientPage from "@/components/privacy-policy/PrivacyPolicyClientPage";

export const metadata: Metadata = {
  title: "Politique de Confidentialité - Trouve Ton Nkama",
  description: "Politique de confidentialité de Trouve Ton Nkama. Découvrez comment nous protégeons vos données personnelles sur notre plateforme immobilière au Gabon.",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClientPage />;
}