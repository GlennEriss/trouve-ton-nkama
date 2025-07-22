import type { Metadata } from "next";
import React from 'react';
import PasswordResetRequest from "@/components/password-reset/PasswordResetRequest";

export const metadata: Metadata = {
  title: "Demande de Réinitialisation de Mot de Passe - Trouve Ton Nkama",
  description: "Demandez la réinitialisation de votre mot de passe Trouve Ton Nkama. Procédure sécurisée pour récupérer l'accès à votre compte immobilier.",
};

export default function RequestPasswordResetPage() {
  return <PasswordResetRequest />;
} 