import Link from "next/link";
import LegalDocumentTemplate, { LegalSection } from "@/components/legal/LegalDocumentTemplate";
import { routes } from "@/constantes/routes";

const termsSections: LegalSection[] = [
  {
    id: "introduction",
    title: "Objet",
    description:
      "Les présentes conditions encadrent l'accès et l'utilisation de la plateforme Trouve Ton Nkama. Toute utilisation implique leur acceptation.",
  },
  {
    id: "eligibilite",
    title: "Éligibilité du compte",
    description:
      "La création de compte est réservée aux utilisateurs fournissant des informations exactes et à jour.",
    bullets: [
      "Vous êtes responsable des données saisies lors de l'inscription.",
      "Vous devez protéger vos identifiants et votre mot de passe.",
      "Tout usage frauduleux peut entraîner suspension ou suppression du compte.",
    ],
  },
  {
    id: "utilisation",
    title: "Utilisation de la plateforme",
    description:
      "La plateforme permet la recherche, la publication et la gestion d'annonces immobilières dans un cadre conforme à la loi et aux bonnes pratiques.",
    bullets: [
      "Pas de contenu trompeur, illégal, diffamatoire ou discriminatoire.",
      "Pas d'usurpation d'identité ni de publication sans autorisation.",
      "Respect des autres utilisateurs et des règles de modération.",
    ],
  },
  {
    id: "responsabilite",
    title: "Responsabilités",
    description:
      "Chaque utilisateur est responsable de son contenu, de ses interactions et des engagements pris via la plateforme.",
    bullets: [
      "Les annonces doivent refléter fidèlement le bien proposé.",
      "L'utilisateur garantit la licéité des contenus publiés.",
      "Trouve Ton Nkama peut retirer un contenu non conforme sans préavis.",
    ],
  },
  {
    id: "donnees",
    title: "Données personnelles",
    description: (
      <>
        Les traitements de données sont détaillés dans la{" "}
        <Link href={routes.public.confidentiality} className="font-medium text-primary hover:underline">
          politique de confidentialité
        </Link>
        .
      </>
    ),
  },
  {
    id: "modifications",
    title: "Modifications et version",
    description:
      "Ces conditions peuvent évoluer pour refléter les changements juridiques, techniques ou produit. La date de mise à jour fait foi.",
  },
];

export default function TermsOfUseClientPage() {
  return (
    <LegalDocumentTemplate
      badge="Cadre d'utilisation"
      title="Conditions d'utilisation"
      subtitle="Ces règles définissent vos droits et obligations lors de l'utilisation de Trouve Ton Nkama."
      updatedAt="5 mars 2026"
      sections={termsSections}
      relatedDocuments={[
        { href: routes.public.confidentiality, label: "Politique de confidentialité" },
        { href: routes.public.announcer_terms, label: "Conditions annonceur" },
      ]}
      contactEmail={process.env.NEXT_PUBLIC_EMAIL_SUPPORT}
    />
  );
}
