/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clover, Search } from "lucide-react";
import { BiCurrentLocation } from "react-icons/bi";
import { useHits, useRefinementList, useRange } from "react-instantsearch";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
// import LanguageModal from "./ModaleLanguageSwitcher";
import { FilterModal } from "./FilterModal";

export default function Navbar() {
  const [theme, setTheme] = useState("light");

  // Applique le thème en fonction de l'état local
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Fonction pour basculer entre les thèmes
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const {
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
    setFilteredResults,
  } = useAlgoliaContext();

  const { refine: cityRefine } = useRefinementList({ attribute: "city" });
  const { refine: streetRefine } = useRefinementList({ attribute: "street" });
  const { refine: typePropertyRefine } = useRefinementList({
    attribute: "typeProperty",
  });
  const { refine: tagsRefine } = useRefinementList({ attribute: "tags" });
  const { refine: areaRefine } = useRange({ attribute: "area" });
  const { refine: priceRefine } = useRange({ attribute: "price" });
  const { refine: roomsRefine } = useRange({ attribute: "nbrRooms" });

  const { hits } = useHits();

  const applyRefinements = () => {
    if (city) cityRefine(city);
    if (street) streetRefine(street);
    if (typeProperty.length > 0)
      typeProperty.forEach((type) => typePropertyRefine(type));
    if (tags.length > 0) tags.forEach((tag) => tagsRefine(tag));

    if (minPrice || maxPrice) {
      priceRefine([
        minPrice ? Number(minPrice) : undefined,
        maxPrice ? Number(maxPrice) : undefined,
      ]);
    }

    if (minArea || maxArea) {
      areaRefine([
        minArea ? Number(minArea) : undefined,
        maxArea ? Number(maxArea) : undefined,
      ]);
    }

    if (minNbrRooms || maxNbrRooms) {
      roomsRefine([
        minNbrRooms ? Number(minNbrRooms) : undefined,
        maxNbrRooms ? Number(maxNbrRooms) : undefined,
      ]);
    }

    setFilteredResults(hits);
  };

  useEffect(() => {
    applyRefinements();
  }, []);

  return (
    <nav className="bg-white dark:bg-black text-black dark:text-white px-4 py-4 md:px-14 md:py-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
      {/* Logo et boutons à droite */}
      <div className="flex items-center justify-between w-full md:w-auto">
        {/* Logo */}
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 bg-black dark:bg-white rounded-full">
            <Clover className="text-white dark:text-black w-6 h-6" />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-2 md:gap-4 ml-auto md:ml-8">
          <a href="/signin" target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              className="text-black dark:text-white border-black dark:border-white rounded-xl px-4 py-2"
            >
              Entrer
            </Button>
          </a>
          <a href="/signup" target="_blank" rel="noopener noreferrer">
            <Button
              variant="default"
              className="bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-white px-4 py-2"
            >
              S&apos;inscrire
            </Button>
          </a>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full border-black dark:border-white flex items-center justify-center bg-black dark:bg-white text-white dark:text-black"
          >
            {theme === "light" ? "🌞" : "🌙"}
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-2 w-full md:w-1/2 max-w-[500px]">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <Input
            placeholder="Chercher une propriété"
            className="bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white placeholder:text-gray-500 border-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 min-h-[50px] rounded-full pl-12"
          />
        </div>
        <FilterModal applyRefinements={applyRefinements} />
        <div className="w-11 h-11 bg-black border-black dark:border-white border-[1px] flex items-center justify-center rounded-full cursor-pointer aspect-square">
          <BiCurrentLocation className="w-6 h-6 text-white" />
        </div>
      </div>
    </nav>
  );
}
