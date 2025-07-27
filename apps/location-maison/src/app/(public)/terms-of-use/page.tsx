import type { Metadata } from "next";
import React from 'react';
import TermsOfUseClientPage from "./TermsOfUseClientPage";

export const metadata: Metadata = {
  title: "Conditions d'Utilisation - Trouve Ton Nkama",
  description: "Conditions d'utilisation de Trouve Ton Nkama. Consultez nos termes et conditions pour l'utilisation de notre plateforme immobilière au Gabon.",
};

export default function TermsOfUsePage() {
  return <TermsOfUseClientPage />;
}