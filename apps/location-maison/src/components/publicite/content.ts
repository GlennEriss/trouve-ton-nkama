/**
 * Contenu statique (copywriting) de la landing /publicite — séparé du JSX pour garder les
 * composants lisibles. Voir docs/location-maison/feature/publicite/LANDING-PUBLICITE.md.
 */

import {
  UtensilsCrossed,
  ShoppingBag,
  Sparkles,
  Car,
  GraduationCap,
  PartyPopper,
  Briefcase,
  Smartphone,
  Eye,
  MousePointerClick,
  Wallet,
  MessageCircle,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react'

export const USE_CASES = [
  { icon: UtensilsCrossed, label: 'Restaurant' },
  { icon: ShoppingBag, label: 'Boutique' },
  { icon: Sparkles, label: 'Beauté' },
  { icon: Car, label: 'Transport' },
  { icon: GraduationCap, label: 'Formation' },
  { icon: PartyPopper, label: 'Événement' },
  { icon: Briefcase, label: 'Service professionnel' },
  { icon: Smartphone, label: 'Application' },
] as const

export const HOW_IT_WORKS_STEPS = [
  {
    number: 1,
    title: 'Choisissez votre forfait',
    text: 'Durée et emplacements de diffusion, à partir de 7 jours.',
    image: '/images/publicite/apercu-forfaits.jpg',
    imageAlt: "Écran de sélection d'un forfait publicitaire sur Trouve Ton Nkama, à partir de 3 750 FCFA",
  },
  {
    number: 2,
    title: 'Ajoutez votre publicité',
    text: 'Une image ou une vidéo, un texte court et votre lien WhatsApp, téléphone ou site.',
    icon: ImageIcon,
  },
  {
    number: 3,
    title: "Vérifiez l'aperçu et payez",
    text: 'Le montant est toujours affiché clairement en FCFA avant paiement.',
    icon: Wallet,
  },
  {
    number: 4,
    title: 'Suivez les résultats',
    text: 'Vues, clics et jours restants, en temps réel depuis votre tableau de bord.',
    image: '/images/publicite/apercu-resultats.jpg',
    imageAlt: 'Tableau de bord affichant les vues, clics et taux de clics d\'une campagne publicitaire',
  },
] as const

export const BENEFITS = [
  {
    icon: Eye,
    title: 'Audience locale',
    text: 'Un public déjà intéressé par les services et les opportunités au Gabon.',
  },
  {
    icon: Wallet,
    title: 'Petit budget',
    text: 'Démarrez avec un forfait accessible, sans engagement long.',
  },
  {
    icon: MessageCircle,
    title: 'Contact direct',
    text: 'Vos clients vous écrivent directement sur WhatsApp, par téléphone ou via votre site.',
  },
  {
    icon: ImageIcon,
    title: 'Image ou vidéo',
    text: 'Publiez le format qui présente le mieux votre activité.',
  },
  {
    icon: MousePointerClick,
    title: 'Résultats suivis',
    text: 'Le nombre de vues et de clics de votre campagne, à tout moment.',
  },
  {
    icon: ShieldCheck,
    title: 'Publicités vérifiées',
    text: 'Chaque publicité est validée avant diffusion, pour protéger la qualité du service.',
  },
] as const

export interface FaqItem {
  question: string
  answer: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'À qui s\'adresse Trouve Ton Nkama Publicité ?',
    answer:
      'À toute entreprise, commerce, indépendant, association ou organisateur d\'événement qui souhaite se faire connaître auprès du public gabonais : restaurant, boutique, salon de beauté, transport, formation, événement, service professionnel, application...',
  },
  {
    question: 'Faut-il proposer un bien immobilier ?',
    answer:
      "Non. La publicité est totalement indépendante des annonces immobilières : aucun bien à louer ou à vendre n'est nécessaire pour créer une campagne.",
  },
  {
    question: 'Où ma publicité sera-t-elle affichée ?',
    answer:
      "Selon le forfait choisi : dans les résultats de recherche, sur une page d'annonce, sur la page d'accueil, sur les pages immobilier, ou dans le fil des Réels — toujours avec le label « Sponsorisé ».",
  },
  {
    question: 'Puis-je publier une vidéo dans les Réels ?',
    answer:
      'Oui. Le forfait Réels accepte une image verticale ou une courte vidéo, diffusée dans le fil des Réels au même format que le contenu naturel de l\'application.',
  },
  {
    question: 'Quel est le tarif minimum ?',
    answer: 'Le forfait Découverte démarre à partir de 3 750 FCFA pour 7 jours sur les résultats de recherche.',
  },
  {
    question: 'Puis-je diriger les clients vers WhatsApp ?',
    answer: 'Oui. Votre publicité peut mener directement vers votre WhatsApp, un numéro de téléphone ou un site web.',
  },
  {
    question: 'Dois-je avoir un compte ?',
    answer:
      "Non pour consulter cette page et comprendre l'offre. Un compte est nécessaire uniquement pour créer et suivre une campagne — la création vous y invite au bon moment.",
  },
  {
    question: 'Comment puis-je suivre les résultats ?',
    answer:
      'Depuis votre tableau de bord Publicités : nombre de vues, nombre de clics, taux de clics et jours restants pour chaque campagne.',
  },
  {
    question: 'Combien de temps faut-il pour valider une publicité ?',
    answer:
      "Chaque visuel est vérifié avant sa mise en ligne, pour protéger la qualité de l'expérience sur la plateforme. Le délai de validation vous est communiqué au moment de la création.",
  },
  {
    question: 'Quels contenus sont refusés ?',
    answer:
      "Les contenus illégaux, trompeurs ou hors-charte. Chaque publicité refusée est accompagnée d'un motif clair, visible depuis votre tableau de bord.",
  },
]

export const WHERE_IT_APPEARS = [
  {
    icon: 'search' as const,
    title: 'Résultats de recherche',
    text: 'Intégrée directement dans la liste des annonces, avec le label « Sponsorisé ».',
  },
  {
    icon: 'listing' as const,
    title: "Page d'annonce",
    text: "Entre le détail d'un bien et les recommandations similaires.",
  },
  {
    icon: 'home' as const,
    title: "Accueil et pages immobilier",
    text: 'Selon le forfait choisi, sur la page d\'accueil et les pages immobilier par ville.',
  },
  {
    icon: 'reels' as const,
    title: 'Fil des Réels',
    text: 'Image verticale ou vidéo, au même format que le contenu naturel du fil.',
  },
] as const
