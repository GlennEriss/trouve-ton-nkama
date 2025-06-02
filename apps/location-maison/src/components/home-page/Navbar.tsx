"use client";

import { useWindowSize } from "@/hooks/useSize";
import Logo from "../logo/Logo";
import { useCurrentUser } from "@/hooks/use-current-user";
import InputSearchNavbar from "./InputSearchNavbar";
import { Button } from "@/components/ui/button";
import { routes } from "@/constantes/routes";
import Link from "next/link";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu"
import MenuProfil from "@/components/navbar/MenuProfil";

export default function Navbar() {
  const { width } = useWindowSize();
  const { user } = useCurrentUser()
  if (width < 768) {
    if (user) {
      return null
    }
    return (
      <nav className="border-b border-gray-300 dark:border-gray-700 sticky top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 text-black dark:text-white px-4 py-4 flex items-center justify-between shadow-md dark:shadow-gray-900/50">
        <div className="flex items-center">
          <LogoNavigation />
        </div>
        <div className="flex items-center gap-4">
          <InputSearchNavbar />
          {user ? (
            <div className="flex items-center">
              <a href={routes.protected.add_property}>
                <button className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-lg text-[10px] px-3 py-2 font-semibold hover:brightness-110 hover:shadow-md transition dark:hover:shadow-[#1FA89B]/20">
                  Poster une annonce
                </button>
              </a>
            </div>
          ) : (
            <ButtonLogin />
          )}
        </div>
      </nav>
    );
  }
  return (
    <div className="rounded-full bg-[#f4f9f9] dark:bg-gray-900 flex shadow dark:shadow-gray-900/50 sticky top-0 z-50">
      <LogoNavigation />
      <div className="ml-auto flex items-center gap-4 mr-5">
        <NavigationMenuNavbar />
        <InputSearchNavbar />
        {user ? (
          <div>
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
        <Logo />
      </a>
    </div>
  )
}

const ButtonLogin = () => {
  return (
    <Button
      variant="ghost"
      className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white border-none rounded-full text-base px-6 py-3 font-semibold hover:brightness-110 hover:shadow-md transition dark:hover:shadow-[#1FA89B]/20"
      asChild
    >
      <Link href={routes.public.signinSignup}>
        Se connecter
      </Link>
    </Button>
  )
}

const ButtonRegister = () => {
  return (
    <Button
      variant="outline"
      className="text-[#146B67] dark:text-[#1FA89B] border border-[#146B67] dark:border-[#1FA89B] rounded-full text-base px-6 py-3 font-semibold hover:brightness-110 hover:shadow-md transition dark:hover:shadow-[#1FA89B]/20"
      asChild>
      <Link href={routes.public.signup}>
        S'inscrire
      </Link>
    </Button>
  )
}

const NavigationMenuNavbar = () => {
  const { user } = useCurrentUser()
  const menu = [
    {
      link: user ? routes.protected.properties : routes.public.signinSignup,
      label: user ? "Mes logements" : ""
    },
    {
      link: routes.public.search_property,
      label: "Catalogue"
    },
    {
      link: user ? routes.protected.add_property : routes.public.signinSignup,
      label: "Poster une annonce"
    },
  ]
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem className="space-x-4">
          {menu.map((item) => (
            <NavigationMenuLink 
              className="text-base text-[#146B67] dark:text-[#1FA89B] font-semibold hover:text-[#146B67] dark:hover:text-[#1FA89B] transition" 
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