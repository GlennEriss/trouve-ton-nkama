import type { Metadata } from "next";
import React from 'react';
import PasswordResetFailure from "@/components/password-reset/PasswordResetFailure";

export const metadata: Metadata = {
  title: "Échec de la Réinitialisation - Trouve Ton Nkama",
  description: "La réinitialisation de votre mot de passe a échoué. Contactez notre support pour obtenir de l'aide.",
};

export default function PasswordResetFailurePage() {
  return <PasswordResetFailure />;
} 