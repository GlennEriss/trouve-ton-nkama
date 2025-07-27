import type { Metadata } from "next";
import React from 'react';
import SignupComponent from "@/components/signup/SignupComponent";

export const metadata: Metadata = {
  title: "Inscription - Trouve Ton Nkama",
  description: "Créez votre compte Trouve Ton Nkama pour publier vos annonces immobilières et accéder à toutes nos fonctionnalités.",
};

export default function SignUpPage() {
  return <SignupComponent />;
}
