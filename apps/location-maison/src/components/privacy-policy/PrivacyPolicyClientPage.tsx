import Link from "next/link";
import { routes } from "@/constantes/routes";
import LegalDocumentTemplate, { LegalSection } from "@/components/legal/LegalDocumentTemplate";

const privacySections: LegalSection[] = [
  {
    id: "collecte",
    title: "Données collectées",
    description:
      "Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme et à la qualité de service.",
    bullets: [
      "Informations d'identité: nom, prénom et date de naissance.",
      "Coordonnées: email et numéro de téléphone.",
      "Données d'usage: logs techniques, navigateur, appareil et adresse IP.",
      "Contenus publiés: annonces, photos, descriptions et interactions.",
    ],
  },
  {
    id: "utilisation",
    title: "Utilisation de vos données",
    description: "Les données collectées sont utilisées pour exploiter le service de manière fiable et sécurisée.",
    bullets: [
      "Création et gestion de compte.",
      "Publication et modération des annonces.",
      "Communication liée au service (notifications, sécurité, support).",
      "Amélioration continue de l'expérience utilisateur.",
    ],
  },
  {
    id: "partage",
    title: "Partage et transfert",
    description:
      "Nous ne revendons pas vos données. Les partages sont limités à des besoins techniques, légaux ou de sécurité.",
    bullets: [
      "Prestataires techniques strictement nécessaires à l'exploitation.",
      "Réquisitions légales des autorités compétentes.",
      "Protection des droits de la plateforme, des utilisateurs et des tiers.",
    ],
  },
  {
    id: "conservation",
    title: "Durée de conservation",
    description:
      "Nous conservons les données pendant une durée proportionnée à la finalité, puis elles sont supprimées ou anonymisées.",
    bullets: [
      "Données de compte: conservées tant que le compte est actif.",
      "Données réglementaires: conservées selon les obligations légales applicables.",
      "Logs techniques: conservés pour diagnostic, sécurité et prévention de fraude.",
    ],
  },
  {
    id: "droits",
    title: "Vos droits",
    description: (
      <>
        Vous pouvez demander l&apos;accès, la correction ou la suppression de vos données. Pour une demande de suppression
        complète, consultez la page{" "}
        <Link href={routes.public.data_deletion} className="font-medium text-primary hover:underline">
          suppression des données
        </Link>
        .
      </>
    ),
    bullets: [
      "Droit d'accès et de rectification.",
      "Droit d'opposition et de limitation selon les cas.",
      "Droit à la suppression dans les limites légales.",
    ],
  },
];

export default function PrivacyPolicyClientPage() {
  return (
    <LegalDocumentTemplate
      badge="Protection des données"
      title="Politique de confidentialité"
      subtitle="Cette page explique quelles données sont collectées, pourquoi elles le sont, et comment elles sont protégées sur Trouve Ton Nkama."
      updatedAt="5 mars 2026"
      sections={privacySections}
      relatedDocuments={[
        { href: routes.public.terms_of_use, label: "Conditions d'utilisation" },
      ]}
      contactEmail={process.env.NEXT_PUBLIC_EMAIL_SUPPORT}
    />
  );
}
