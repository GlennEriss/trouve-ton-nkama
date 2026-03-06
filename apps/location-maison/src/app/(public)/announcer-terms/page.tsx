import type { Metadata } from "next";
import AnnouncerTermsClientPage from "./AnnouncerTermsClientPage";

export const metadata: Metadata = {
  title: "Conditions Annonceur - Trouve Ton Nkama",
  description:
    "Conditions spécifiques applicables aux comptes annonceur sur Trouve Ton Nkama: publication, qualité des annonces et obligations du compte.",
};

export default function AnnouncerTermsPage() {
  return <AnnouncerTermsClientPage />;
}
