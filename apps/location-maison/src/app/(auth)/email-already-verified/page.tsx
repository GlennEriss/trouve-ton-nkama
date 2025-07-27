import type { Metadata } from "next";
import React from 'react';
import EmailAlreadyVerified from "@/components/email-verification/EmailAlreadyVerified";

export const metadata: Metadata = {
  title: "Email Déjà Vérifié - Trouve Ton Nkama",
  description: "Votre email a déjà été vérifié. Votre compte Trouve Ton Nkama est actif et vous pouvez accéder à toutes nos fonctionnalités.",
};

export default function EmailAlreadyVerifiedPage() {
  return <EmailAlreadyVerified />;
} 