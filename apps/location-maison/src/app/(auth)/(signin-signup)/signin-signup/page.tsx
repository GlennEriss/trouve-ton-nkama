import type { Metadata } from "next";
import React from 'react';
import SigninSignupComponent from "@/components/signin/SigninSignupComponent";

export const metadata: Metadata = {
  title: "Connexion et Inscription - Trouve Ton Nkama",
  description: "Connectez-vous ou créez votre compte Trouve Ton Nkama pour accéder à nos services immobiliers au Gabon.",
};

export default function SignInSignUpPage() {
  return <SigninSignupComponent />;
}
