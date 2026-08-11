"use client";

import { useWindowSize } from "@/hooks/useSize";
import Logo from "../logo/Logo";
import { useCurrentUser } from "@/hooks/use-current-user";
import InputSearchNavbar from "./InputSearchNavbar";
import { Button } from "@/components/ui/button";
import { routes } from "@/constantes/routes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu"
import MenuProfil from "@/components/navbar/MenuProfil";
import Notifications from "@/components/navbar/Notifications";

export default function Navbar() {
  const { width } = useWindowSize();
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const isAnnouncer = Array.isArray(user?.roles) && user.roles.includes('Announcer');
  
  // Vérifier si on est sur une route protégée
  const isProtectedRoute = Object.values(routes.protected).some(route =>
    pathname.startsWith(route)
  );

  // Le flux public de réels est plein écran façon TikTok (vidéo en h-[100dvh]) : empiler ce
  // navbar par-dessus ajoute sa hauteur au-dessus des 100dvh de la vidéo, ce qui fait dépasser
  // la page de la hauteur de l'écran et provoque un scroll indésirable. Match exact seulement
  // (pas /reels/mine, qui garde son AppMobileStickyHeader habituel).
  const isReelsFeedRoute = pathname === routes.protected.reels

  // Création ET édition de réel plein écran façon statut WhatsApp (éditeur vidéo en fixed
  // inset-0) : ce navbar (z-[9999]) recouvrirait les boutons de l'éditeur (fermer, couper le
  // son, envoyer) sur mobile ET desktop — aucune barre sur ces routes.
  const isReelEditRoute = /^\/reels\/[^/]+\/edit\/?$/.test(pathname)
  if (pathname === routes.protected.reels_add || pathname.startsWith(`${routes.protected.reels_add}/`) || isReelEditRoute) {
    return null
  }

  if (width < 768) {
    if (isReelsFeedRoute) {
      return null
    }

    // Utilisateur connecté : petite barre persistante (notifications + profil) — sans elle,
    // ces deux écrans ne sont plus atteignables sur mobile depuis que "Notifs" a quitté la
    // bottom nav (remplacée par "Réels"). S'affiche même sur les pages "protégées" qui ont
    // leur propre AppMobileStickyHeader : les deux s'empilent (barre de compte globale +
    // en-tête contextuel de la page), ce n'est pas redondant.
    if (user) {
      return (
        <nav className="sticky top-0 left-0 right-0 z-[9999] flex items-center justify-between border-b border-gray-200 bg-white/90 px-4 py-2 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/90">
          <a href="/" rel="noopener noreferrer" className="flex items-center gap-2">
            <Logo width="32px" height="32px" />
            <span className="text-sm font-black text-primary dark:text-secondary">
              Trouve Ton Nkama
            </span>
          </a>
          <div className="flex items-center gap-3">
            <Notifications />
            <MenuProfil />
          </div>
        </nav>
      )
    }

    // Visiteur non connecté sur une page "protégée" (ex: /property/add, accessible sans
    // compte) : celle-ci a déjà son propre en-tête sticky (AppMobileStickyHeader). Ne pas
    // empiler la navbar générique par-dessus.
    if (isProtectedRoute) {
      return null
    }
    return (
      <nav className="border-b border-gray-300 dark:border-gray-700 sticky top-0 left-0 right-0 z-[9999] bg-white dark:bg-gray-900 text-black dark:text-white px-4 py-4 flex items-center justify-between shadow-md dark:shadow-gray-900/50">
        <div className="flex items-center gap-2">
          <LogoNavigation />
          <a href="/" rel="noopener noreferrer" className="inline-flex min-h-11 min-w-11 items-center">
            <div className="flex flex-col items-start justify-center leading-none hover:opacity-80 transition-opacity cursor-pointer">
              <span className="text-primary dark:text-secondary font-black text-xs drop-shadow-sm">
                Trouve
              </span>
              <span className="text-primary dark:text-secondary font-black text-xs drop-shadow-sm">
                Ton
              </span>
              <span className="text-primary dark:text-secondary font-black text-xs drop-shadow-sm">
                Nkama
              </span>
            </div>
          </a>
        </div>
        <div className="flex items-center gap-4">
          {!isProtectedRoute && <InputSearchNavbar />}
                  {user && isAnnouncer ? (
          <div className="flex items-center gap-2">
            <Notifications />
            <Link href={routes.protected.publish}>
              <button className="bg-gradient-to-r from-primary via-secondary to-primary text-white rounded-lg text-[10px] px-3 py-2 font-semibold hover:brightness-110 hover:shadow-md transition-all duration-300 hover:scale-105 dark:hover:shadow-secondary/20">
                Poster une annonce
              </button>
            </Link>
            <Link href={routes.protected.advertising}>
              <button className="border border-secondary text-primary dark:text-secondary rounded-lg text-[10px] px-3 py-2 font-semibold hover:bg-secondary/10 transition-all duration-300 hover:scale-105">
                Publicité
              </button>
            </Link>
          </div>
          ) : (
            <ButtonLogin />
          )}
        </div>
      </nav>
    );
  }
  return (
    <div className="rounded-2xl bg-primary-50 dark:bg-gray-900 shadow dark:shadow-gray-900/50 sticky top-0 z-[9999] overflow-hidden">
      {/* Ligne utilitaire : logo, recherche, compte — toujours la même, quelle que soit la page */}
      <div className="flex items-center gap-6 px-5 py-3">
        <LogoWithWordmark />

        <div className="flex-1 flex justify-center min-w-0">
          {!isProtectedRoute && <InputSearchNavbar />}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-5">
              <Notifications />
              <MenuProfil />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ButtonLogin />
              <ButtonRegister />
            </div>
          )}
          <ButtonPostAd />
        </div>
      </div>

      {/* Ligne de navigation secondaire : catégories, sur fond teinté */}
      <div className="border-t border-primary-100 dark:border-gray-800 bg-primary-100/40 dark:bg-gray-800/60 px-5">
        <NavigationMenuNavbar />
      </div>
    </div>
  )
}

const LogoNavigation = () => {
  return (
    <div className="rounded-full bg-primary-50 dark:bg-gray-900 shadow dark:shadow-gray-900/50">
      <a href="/" rel="noopener noreferrer" aria-label="Accueil - Trouve Ton Nkama">
        <Logo width="64px" height="64px" />
      </a>
    </div>
  )
}

// Logo + wordmark combinés sur une seule ligne, réservé à la navbar desktop en 2 lignes.
// (LogoNavigation ci-dessus reste icône seule : le bloc "Trouve Ton Nkama" est déjà rendu
// séparément par la navbar mobile visiteur, qui réutilise LogoNavigation à côté de son propre
// texte — lui ajouter le wordmark ici créerait un doublon sur cette route.)
const LogoWithWordmark = () => {
  return (
    <Link href="/" rel="noopener noreferrer" aria-label="Accueil - Trouve Ton Nkama" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
      <Logo width="40px" height="40px" />
      <div className="flex flex-col items-start justify-center leading-none">
        <span className="text-primary dark:text-secondary font-black text-xs drop-shadow-sm">Trouve</span>
        <span className="text-primary dark:text-secondary font-black text-xs drop-shadow-sm">Ton</span>
        <span className="text-primary dark:text-secondary font-black text-xs drop-shadow-sm">Nkama</span>
      </div>
    </Link>
  )
}

const ButtonPostAd = () => {
  return (
    <Button
      variant="ghost"
      className="h-11 bg-gradient-to-r from-primary via-secondary to-primary text-white border-none rounded-full text-sm px-5 py-3 font-semibold hover:brightness-110 hover:shadow-md transition-all duration-300 hover:scale-105 dark:hover:shadow-secondary/20 whitespace-nowrap"
      asChild
    >
      <Link href={routes.protected.publish}>
        + Poster une annonce
      </Link>
    </Button>
  )
}

const ButtonLogin = () => {
  return (
    <Button
      variant="ghost"
      className="h-11 text-primary dark:text-secondary rounded-full text-sm px-4 py-3 font-semibold hover:bg-primary/5 dark:hover:bg-secondary/10 transition-all duration-300 whitespace-nowrap"
      asChild
    >
      <Link href={routes.public.signin}>
        Se connecter
      </Link>
    </Button>
  )
}

const ButtonRegister = () => {
  return (
    <Button
      variant="outline"
      className="h-11 text-primary dark:text-secondary border border-primary dark:border-secondary rounded-full text-sm px-5 py-3 font-semibold hover:bg-primary/5 dark:hover:bg-secondary/5 transition-all duration-300 whitespace-nowrap"
      asChild>
      <Link href={routes.public.signup}>
        S'inscrire
      </Link>
    </Button>
  )
}

const NavigationMenuNavbar = () => {
  const { user } = useCurrentUser()
  const isAnnouncer = Array.isArray(user?.roles) && user.roles.includes('Announcer')
  const menu = [
    ...(isAnnouncer ? [{
      link: routes.protected.properties,
      label: "Mes annonces"
    }] : []),
    {
      link: routes.public.search_property,
      label: "Catalogue"
    },
    {
      link: routes.protected.reels,
      label: "Réels"
    },
    ...(user ? [{
      link: routes.protected.reels_mine,
      label: "Mes réels"
    }] : []),
    ...(user ? [{
      link: routes.protected.advertising,
      label: "Publicité"
    }] : []),
  ]
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem className="space-x-5">
          {menu.map((item) => (
            <NavigationMenuLink
              className="text-[13px] py-2 inline-block text-primary/80 dark:text-secondary/80 font-semibold hover:text-primary dark:hover:text-secondary transition-colors duration-200"
              key={item.label}
              href={item.link}
            >
              {item.label}
            </NavigationMenuLink>
          ))}
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
