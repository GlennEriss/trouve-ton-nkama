import type { Metadata } from "next";
import React from 'react';
import EmailVerificationSuccess from "@/components/email-verification/EmailVerificationSuccess";

export const metadata: Metadata = {
  title: "Email Vérifié avec Succès - Trouve Ton Nkama",
  description: "Votre email a été vérifié avec succès. Votre compte Trouve Ton Nkama est maintenant actif et vous pouvez accéder à toutes nos fonctionnalités.",
};

export default function EmailVerificationSuccessPage() {
  return <EmailVerificationSuccess />;
} 