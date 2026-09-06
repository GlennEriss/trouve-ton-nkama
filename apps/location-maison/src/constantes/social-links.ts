import type { LucideIcon } from "lucide-react";
import { Facebook, Instagram, MessagesSquare, Music2, Radio } from "lucide-react";

/**
 * Comptes/réseaux officiels de la plateforme (≠ réseaux sociaux d'un utilisateur/annonceur,
 * voir profile-information.schema.ts). Source unique réutilisée par le footer (liens discrets)
 * et par /suivez-nous (page dédiée, liée depuis la notification "donnez de la force à
 * Trouve Ton Nkama").
 */
export interface PlatformSocialLink {
  key: string;
  label: string;
  url: string;
  icon: LucideIcon;
  /** Verbe d'action affiché sur le footer (contexte compact). */
  footerLabel: string;
  /** Phrase courte affichée sur /suivez-nous (contexte détaillé, une par réseau). */
  pitch: string;
}

export const PLATFORM_SOCIAL_LINKS: PlatformSocialLink[] = [
  {
    key: "facebook",
    label: "Facebook",
    url: "https://www.facebook.com/share/16beeh915e/",
    icon: Facebook,
    footerLabel: "Suivez-nous sur Facebook",
    pitch: "Les nouvelles annonces, les actus de la plateforme et notre communauté au quotidien.",
  },
  {
    key: "whatsapp_channel",
    label: "Chaîne WhatsApp",
    url: "https://whatsapp.com/channel/0029Vb8Pdzv3wtb4UbkmPX0z",
    icon: Radio,
    footerLabel: "Rejoignez notre chaîne",
    pitch: "Les meilleures offres et les annonces urgentes, directement dans votre WhatsApp.",
  },
  {
    key: "tiktok",
    label: "TikTok",
    url: "https://www.tiktok.com/@tonnkama?is_from_webapp=1&sender_device=pc",
    icon: Music2,
    footerLabel: "Suivez-nous sur TikTok",
    pitch: "Des visites vidéo, des conseils immobilier et les coulisses de Trouve Ton Nkama.",
  },
  {
    key: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/trouvetonnkama/",
    icon: Instagram,
    footerLabel: "Suivez-nous sur Instagram",
    pitch: "Les plus belles annonces en photo, nos nouveautés et nos coups de cœur.",
  },
  {
    key: "threads",
    label: "Threads",
    url: "https://www.threads.com/@trouvetonkama",
    icon: MessagesSquare,
    footerLabel: "Suivez-nous sur Threads",
    pitch: "Nos échanges avec la communauté, en direct et sans détour.",
  },
];

