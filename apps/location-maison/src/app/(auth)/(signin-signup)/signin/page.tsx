import type { Metadata } from "next";
import React from 'react';
import SigninComponent from "@/components/signin/SigninComponent";

export const metadata: Metadata = {
  title: "Connexion - Trouve Ton Nkama",
  description: "Connectez-vous à votre compte Trouve Ton Nkama pour accéder à vos annonces immobilières et gérer votre profil.",
};

export default function SignInPage() {
  return <SigninComponent />;
}
