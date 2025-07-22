import type { Metadata } from "next";
import React from 'react';
import PasswordReset from "@/components/password-reset/PasswordReset";

export const metadata: Metadata = {
  title: "Réinitialisation de Mot de Passe - Trouve Ton Nkama",
  description: "Réinitialisez votre mot de passe Trouve Ton Nkama. Procédure sécurisée pour créer un nouveau mot de passe et accéder à votre compte.",
};

export default function PasswordResetPage() {
  return <PasswordReset />;
} 