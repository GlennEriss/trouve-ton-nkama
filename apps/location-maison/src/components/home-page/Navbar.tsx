"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clover, Search, Plus } from "lucide-react";
import { BiSearch } from "react-icons/bi";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { FilterModal } from "./FilterModal";
import { useWindowSize } from "@/hooks/useSize";
import MenuProfil from "../navbar/MenuProfil";
import { routes } from "@/constantes/routes";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";
import Logo from "../logo/Logo";

export default function Navbar({ session }: { session: Session | null }) {
  const router = useRouter();
  const { width } = useWindowSize();

  // Thème local
  const [theme, setTheme] = useState("light");
  const [showSearch, setShowSearch] = useState(false);

  // Récupération du contexte (champs de recherche/filtres)
  const {
    searchText,
    setSearchText,
    city,
    street,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minNbrRooms,
    maxNbrRooms,
    typeProperty,
    tags,
  } = useAlgoliaContext();

  // Gestion du thème (light/dark)
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  /**
   * Construit l'URL à partir des champs du contexte et redirige vers /search
   */
  const handleSearch = () => {
    // Construire l'URL
    const params = new URLSearchParams();
    if (searchText) params.append("query", searchText);
    if (city) params.append("city", city);
    if (street) params.append("street", street);
    if (minPrice) params.append("minPrice", minPrice);
    if (maxPrice) params.append("maxPrice", maxPrice);
    if (minArea) params.append("minArea", minArea);
    if (maxArea) params.append("maxArea", maxArea);
    if (minNbrRooms) params.append("minNbrRooms", minNbrRooms);
    if (maxNbrRooms) params.append("maxNbrRooms", maxNbrRooms);
    if (typeProperty && typeProperty.length > 0) {
      params.append("typeProperty", typeProperty.join(","));
    }
    if (tags && tags.length > 0) {
      params.append("tags", tags.join(","));
    }

    router.push(`/search?${params.toString()}`);
  };
  // --- Rendu mobile ---
  if (width < 768) {
    if (session?.user) {
      return null
    }
    return (
      <nav className="sticky top-0 left-0 right-0 z-50 bg-white dark:bg-black text-black dark:text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center">
          <a href="/" rel="noopener noreferrer">
            <Logo />
          </a>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-11 h-11 flex items-center justify-center bg-white border border-[#146B67] dark:bg-gray-800 rounded-full"
          >
            <Search className="w-6 h-6 text-[#146B67] dark:text-white" />
          </button>
          {/* La FilterModal peut toujours utiliser le contexte pour remplir city, price, etc. */}
          <FilterModal handleSearch={handleSearch} />
          {session ? (
            <div className="flex items-center">
              <a href={routes.protected.add_property}>
                <button className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-lg text-[10px] px-3 py-2 font-semibold hover:brightness-110 hover:shadow-md transition">
                  Poster une annonce
                </button>
              </a>
            </div>
          ) : (
            <a href={routes.public.signinSignup}>
              <Button variant="outline"
                className="bg-transparent border border-[#146B67] text-[#146B67] rounded-lg text-base px-6 py-3 font-semibold hover:bg-[#0f5c59] hover:text-white hover:shadow-md transition"
              >
                Se connecter
              </Button>
            </a>
          )}
        </div>
        {showSearch && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-black shadow-md p-4 flex w-full">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white placeholder:text-gray-500 border-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 min-h-[45px] rounded-full pl-12"
              />
            </div>
            <div
              onClick={handleSearch}
              className="ml-2 w-11 h-11 border border-[#146B67] text-[#146B67] hover:bg-[#146B67] hover:text-white flex items-center justify-center rounded-full cursor-pointer aspect-square"
            >
              <BiSearch className="w-6 h-6" />
            </div>
          </div>
        )}
      </nav>
    );
  }

  // --- Rendu desktop ---
  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-white dark:bg-black text-black dark:text-white px-4 pt-6 pb-4 lg:px-14 md:py-6 flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 shadow-md">
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center">
          <a href="/" rel="noopener noreferrer">
            <Logo />
          </a>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-2 w-full md:w-1/2 max-w-[500px] mr-1">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Chercher une propriété"
            className="bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white placeholder:text-gray-500 border-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 min-h-[50px] rounded-full pl-12"
          />
        </div>
        <div
          onClick={handleSearch}
          className="w-11 h-11 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] border-none flex items-center justify-center rounded-full cursor-pointer aspect-square"
        >
          <BiSearch className="w-6 h-6 text-white" />
        </div>
        <FilterModal handleSearch={handleSearch} />
      </div>

      <div className="flex items-center">
        <a href={routes.protected.add_property} rel="noopener noreferrer">
          <Button
            variant="default"
            className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-lg text-base px-6 py-3 font-semibold hover:brightness-110 hover:shadow-md transition"
          >
            Poster une annonce
          </Button>
        </a>
        {/* Boutons */}
        {
          session ? (
            <MenuProfil />
          ) : (
            <div className="flex items-center gap-2 md:gap-4 mx-4">
              <a href="/signin" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  className="bg-transparent border border-[#146B67] text-[#146B67] rounded-lg text-base px-6 py-3 font-semibold hover:bg-[#0f5c59] hover:text-white hover:shadow-md transition"
                >
                  Se connecter
                </Button>
              </a>
              <a href="/signup" rel="noopener noreferrer">
                <Button
                  variant="default"
                  className="bg-transparent border border-[#146B67] text-[#146B67] rounded-lg text-base px-6 py-3 font-semibold hover:bg-[#0f5c59] hover:text-white hover:shadow-md transition"
                >
                  S&apos;inscrire
                </Button>
              </a>
            </div>
          )
        }
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full border-black dark:border-white flex items-center justify-center bg-black dark:bg-white text-white dark:text-black"
        >
          {theme === "light" ? "🌞" : "🌙"}
        </button>
      </div>
    </nav>
  );
}
