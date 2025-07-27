import type { Metadata } from "next";
import React from 'react';
import DataDeletionClientPage from "@/components/data-deletion/DataDeletionClientPage";

export const metadata: Metadata = {
  title: "Suppression des Données - Trouve Ton Nkama",
  description: "Demande de suppression de vos données personnelles sur Trouve Ton Nkama. Exercice de vos droits RGPD et protection de votre vie privée.",
};

export default function DataDeletionPage() {
  return <DataDeletionClientPage />;
}