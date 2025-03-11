"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clover, Search, LogIn, User, Plus } from "lucide-react";
import { BiCurrentLocation } from "react-icons/bi";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { FilterModal } from "./FilterModal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWindowSize } from "@/hooks/useSize";
import MenuProfil from "../navbar/MenuProfil";
import { useHits, useRange, useRefinementList } from "react-instantsearch";
import { routes } from "@/constantes/routes";

export default function Navbar() {
  const user = useCurrentUser();
  const { width } = useWindowSize();
  const [theme, setTheme] = useState("light");
  const [showSearch, setShowSearch] = useState(false);

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
  return width < 768 ? (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-white dark:bg-black text-black dark:text-white px-4 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <div className="w-10 h-10 flex items-center justify-center bg-black dark:bg-white rounded-full">
          <Clover className="text-white dark:text-black w-6 h-6" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full"
        >
          <Search className="w-6 h-6 text-black dark:text-white" />
        </button>
        <FilterModal applyRefinements={() => { }} />
        <button className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full">
          <BiCurrentLocation className="w-6 h-6 text-black dark:text-white" />
        </button>
        {user ? (
          <>
            <a href={routes.protected.add_property}>
              <button className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full">
                <Plus className="w-6 h-6" />
              </button>
            </a>
            {/* <MenuProfil /> */}
          </>
        ) : (
          <a href="/signin">
            <Button variant="outline" className="px-4 py-2">Se connecter</Button>
          </a>
        )}
      </div>
      {showSearch && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-black shadow-md p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <Input
              placeholder="Rechercher..."
              className="w-full bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white placeholder:text-gray-500 border-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 min-h-[50px] rounded-full pl-12"
            />
          </div>
        </div>
      )}
    </nav>
  ) : (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-white dark:bg-black text-black dark:text-white px-4 pt-6 pb-4 lg:px-14 md:py-6 flex flex-col md:flex-row  justify-between space-y-4 md:space-y-0 shadow-md">
      {/* Logo et boutons à droite */}
      <div className="flex items-center justify-between w-full md:w-auto">
        {/* Logo */}
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 bg-black dark:bg-white rounded-full">
            <Clover className="text-white dark:text-black w-6 h-6" />
          </div>
        </div>

        {/* Boutons */}
        {
          user ? (
            <MenuProfil />
          ) : (
            <div className="flex items-center gap-2 md:gap-4 ml-auto mr-1 md:ml-8">
              <a href="/signin" target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  className="text-black dark:text-white border-black dark:border-white rounded-xl px-4 py-2"
                >
                  Se connecter
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
          )
        }

      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-2 w-full md:w-1/2 max-w-[500px] mr-1">
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
      <a href="/publish" target="_blank" rel="noopener noreferrer">
        <Button
          variant="default"
          className="bg-blue-500 text-white rounded-xl text-lg hover:bg-blue-600 px-4 py-6 font-bold"
        >
          Poster une annonce
        </Button>
      </a>
    </nav>
  );
}