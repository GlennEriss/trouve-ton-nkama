import Link from "next/link";
import LegalDocumentTemplate, { LegalSection } from "@/components/legal/LegalDocumentTemplate";
import { routes } from "@/constantes/routes";

const announcerSections: LegalSection[] = [
  {
    id: "scope",
    title: "Champ d'application",
    description:
      "Ces conditions s'appliquent à tout compte ayant le rôle Annonceur. Elles complètent les conditions générales d'utilisation.",
  },
  {
    id: "eligibility",
    title: "Conditions d'accès au rôle Annonceur",
    description:
      "L'Annonceur déclare disposer du droit de publier les biens proposés et des autorisations nécessaires.",
    bullets: [
      "Les informations de profil doivent être exactes et à jour.",
      "Un compte Annonceur conserve aussi les droits d'un compte Utilisateur.",
      "L'acceptation de ces conditions est obligatoire pour publier des annonces.",
    ],
  },
  {
    id: "listing-quality",
    title: "Qualité et exactitude des annonces",
    description:
      "Toute annonce doit refléter fidèlement la réalité du bien immobilier et des conditions de location.",
    bullets: [
      "Prix, localisation et disponibilité doivent être véridiques.",
      "Photos et descriptions doivent correspondre au bien proposé.",
      "Les contenus mensongers, dupliqués ou trompeurs sont interdits.",
    ],
  },
  {
    id: "compliance",
    title: "Conformité légale",
    description:
      "L'Annonceur est seul responsable de la conformité légale de ses publications, de ses échanges et de ses transactions.",
    bullets: [
      "Respect des lois en vigueur et obligations fiscales applicables.",
      "Respect des droits des tiers (image, propriété, vie privée).",
      "Coopération avec l'équipe support en cas de litige ou signalement.",
    ],
  },
  {
    id: "moderation",
    title: "Modération et sanctions",
    description:
      "Trouve Ton Nkama peut modérer, suspendre ou supprimer un contenu/compte Annonceur en cas de non-respect des règles.",
    bullets: [
      "Retrait immédiat possible en cas de risque pour les utilisateurs.",
      "Suspension temporaire ou définitive selon la gravité.",
      "Conservation d'éléments de preuve à des fins de sécurité et conformité.",
    ],
  },
  {
    id: "links",
    title: "Documents complémentaires",
    description: (
      <>
        Ces conditions sont à lire conjointement avec les{" "}
        <Link href={routes.public.terms_of_use} className="font-medium text-primary hover:underline">
          conditions d&apos;utilisation
        </Link>{" "}
        et la{" "}
        <Link href={routes.public.confidentiality} className="font-medium text-primary hover:underline">
          politique de confidentialité
        </Link>
        .
      </>
    ),
  },
];

export default function AnnouncerTermsClientPage() {
  return (
    <LegalDocumentTemplate
      badge="Règles annonceur"
      title="Conditions Annonceur"
      subtitle="Ce document précise les obligations spécifiques des comptes Annonceur pour garantir des annonces fiables et conformes."
      updatedAt="5 mars 2026"
      sections={announcerSections}
      relatedDocuments={[
        { href: routes.public.terms_of_use, label: "Conditions d'utilisation" },
        { href: routes.public.confidentiality, label: "Politique de confidentialité" },
      ]}
      contactEmail={process.env.NEXT_PUBLIC_EMAIL_SUPPORT}
    />
  );
}
