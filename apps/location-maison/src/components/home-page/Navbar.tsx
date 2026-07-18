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
            <span className="text-sm font-black text-[#146B67] dark:text-[#1FA89B]">
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
          <a href="/" rel="noopener noreferrer">
            <div className="flex flex-col items-start justify-center leading-none hover:opacity-80 transition-opacity cursor-pointer">
              <span className="text-[#146B67] dark:text-[#1FA89B] font-black text-xs drop-shadow-sm">
                Trouve
              </span>
              <span className="text-[#146B67] dark:text-[#1FA89B] font-black text-xs drop-shadow-sm">
                Ton
              </span>
              <span className="text-[#146B67] dark:text-[#1FA89B] font-black text-xs drop-shadow-sm">
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
              <button className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-lg text-[10px] px-3 py-2 font-semibold hover:brightness-110 hover:shadow-md transition-all duration-300 hover:scale-105 dark:hover:shadow-[#1FA89B]/20">
                Poster une annonce
              </button>
            </Link>
            <Link href={routes.protected.advertising}>
              <button className="border border-[#1FA89B] text-[#146B67] dark:text-[#1FA89B] rounded-lg text-[10px] px-3 py-2 font-semibold hover:bg-[#1FA89B]/10 transition-all duration-300 hover:scale-105">
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
    <div className="rounded-full bg-[#f4f9f9] dark:bg-gray-900 flex shadow dark:shadow-gray-900/50 sticky top-0 z-[9999]">
      <div className="flex items-center gap-2">
        <LogoNavigation />
        <a href="/" rel="noopener noreferrer">
          <div className="flex flex-col items-start justify-center leading-none hover:opacity-80 transition-opacity cursor-pointer">
            <span className="text-[#146B67] dark:text-[#1FA89B] font-black text-sm drop-shadow-sm">
              Trouve
            </span>
            <span className="text-[#146B67] dark:text-[#1FA89B] font-black text-sm drop-shadow-sm">
              Ton
            </span>
            <span className="text-[#146B67] dark:text-[#1FA89B] font-black text-sm drop-shadow-sm">
              Nkama
            </span>
          </div>
        </a>
      </div>
      <div className="ml-auto flex items-center gap-4 mr-5">
        <NavigationMenuNavbar />
        {!isProtectedRoute && <InputSearchNavbar />}
        {user ? (
          <div className="flex items-center gap-8">
            <Notifications />
            <MenuProfil />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ButtonLogin />
            <ButtonRegister />
          </div>
        )}
      </div>
    </div>
  )
}

const LogoNavigation = () => {
  return (
    <div className="rounded-full bg-[#f4f9f9] dark:bg-gray-900 shadow dark:shadow-gray-900/50">
      <a href="/" rel="noopener noreferrer">
        <Logo width="64px" height="64px" />
      </a>
    </div>
  )
}

const ButtonLogin = () => {
  return (
    <Button
      variant="ghost"
      className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white border-none rounded-full text-base px-6 py-3 font-semibold hover:brightness-110 hover:shadow-md transition-all duration-300 hover:scale-105 dark:hover:shadow-[#1FA89B]/20"
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
      className="text-[#146B67] dark:text-[#1FA89B] border border-[#146B67] dark:border-[#1FA89B] rounded-full text-base px-6 py-3 font-semibold hover:brightness-110 hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-[#146B67]/5 dark:hover:bg-[#1FA89B]/5 dark:hover:shadow-[#1FA89B]/20"
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
    {
      link: routes.protected.publish,
      label: "Poster une annonce"
    },
    ...(user ? [{
      link: routes.protected.advertising,
      label: "Publicité"
    }] : []),
  ]
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem className="space-x-4">
          {menu.map((item) => (
            <NavigationMenuLink 
              className="text-base text-[#146B67] dark:text-[#1FA89B] font-semibold hover:text-[#146B67] dark:hover:text-[#1FA89B] relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#146B67] dark:after:bg-[#1FA89B] after:transition-all after:duration-300 hover:after:w-full" 
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
