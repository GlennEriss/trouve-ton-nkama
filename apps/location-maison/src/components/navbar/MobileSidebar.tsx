"use client";

/**
 * Menu latéral mobile (façon leboncoin) : hamburger dans le header mobile,
 * panneau coulissant avec les liens secondaires qui n'ont pas de place dans
 * la bottom nav (5 emplacements fixes, réservés aux actions principales).
 * Reprend la même liste que le footer desktop (Footer.tsx) pour ne pas
 * dupliquer une nouvelle taxonomie de liens.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { routes } from "@/constantes/routes";
import { cn } from "@/lib/utils";
import Logo from "../logo/Logo";

const SIDEBAR_LINKS: Array<{ href: string; label: string; highlight?: boolean }> = [
  { href: routes.public.search_requests, label: "Demandes de recherche", highlight: true },
  { href: routes.public.blog, label: "Blog" },
  { href: routes.public.immobilier, label: "Immobilier Gabon" },
  { href: "/immobilier/location/maison", label: "Maisons à louer" },
  { href: "/immobilier/vente/maison", label: "Maisons à vendre" },
  { href: routes.public.guide_immobilier_gabon, label: "Guide Immobilier" },
  { href: routes.public.advertise, label: "Faire de la pub" },
  { href: routes.public.confidentiality, label: "Politique de confidentialité" },
  { href: routes.public.terms_of_use, label: "Conditions d'utilisation" },
  { href: routes.public.announcer_terms, label: "Conditions annonceur" },
];

export default function MobileSidebar({
  isOpen,
  onClose,
}: Readonly<{ isOpen: boolean; onClose: () => void }>) {
  // Rendu en portail dans <body> : Navbar est parfois monté sous un ancêtre
  // avec un `transform` (ex. l'effet "porte de garage" de la navbar mobile
  // sur l'accueil, HomePageMobileComponent). Un `transform` sur un ancêtre
  // devient le containing block de tout descendant `position: fixed`, donc
  // sans portail ce panneau se retrouve coincé dans la hauteur de la navbar
  // au lieu de couvrir l'écran — invisible bien que correctement ouvert.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const content = (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[10001] w-[80%] max-w-xs overflow-y-auto bg-white shadow-2xl transition-transform duration-300 dark:bg-gray-900 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-800">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            <Logo width="32px" height="32px" />
            <span className="text-sm font-black text-primary dark:text-secondary">
              Trouve Ton Nkama
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col py-2">
          {SIDEBAR_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "px-5 py-3 text-sm transition-colors",
                link.highlight
                  ? "font-semibold text-secondary"
                  : "font-medium text-gray-700 hover:text-primary dark:text-gray-200 dark:hover:text-secondary",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
