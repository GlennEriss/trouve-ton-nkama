"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { BiFilter } from "react-icons/bi";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { getTypePropertyKey, TypeProperty } from "@/lib/utils";
import { tags as tagsList } from "@/constantes";
import {
  ToggleRefinement, RefinementList,
  useRange
} from "react-instantsearch";
import { useRouter } from "next/navigation";
import { useAlgoliaRefinements } from "@/providers/AlgoliaRefinementsContext";


export const FilterModal = ({
  handleSearch,
}: {
  handleSearch: () => void;
}) => {
  const router = useRouter();

  const { refineTags } = useAlgoliaRefinements();

  const {
    city,
    setCity,
    street,
    setStreet,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    minArea,
    setMinArea,
    maxArea,
    setMaxArea,
    minNbrRooms,
    setMinNbrRooms,
    maxNbrRooms,
    setMaxNbrRooms,
    typeProperty,
    setTypeProperty,
    tags,
    setTags,
    clearFilters,
  } = useAlgoliaContext();

  // État local pour l'ouverture/fermeture de la modal
  const [open, setOpen] = useState(false);

  //pour autoriser l'effacement des filtres
  const [isClearFilters, setIsClearFilters] = useState(false);

  /**
   * Fonction utilitaire pour ajouter/retirer un élément d'un tableau (typeProperty, tags)
   */
  const toggleSelection = (
    (list: string[], item: string, setter: (val: string[]) => void) => {
      if (list.includes(item)) {
        const newList = list.filter((i) => i !== item);
        //console.log(`Retrait de l'élément "${item}". Nouvelle liste :`, newList);
        setter(newList);
      } else {
        const newList = [...list, item];
        console.log(`Ajout de l'élément "${item}". Nouvelle liste :`, newList);
        setter(newList);
      }
    }
  );

  /**
   * Valide et applique les filtres (appel d'applyRefinements et handleSearch)
   */
  const handleApplyFilters = () => {
    // Vérification basique des valeurs min/max
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      alert("Le prix minimum ne peut pas être supérieur au prix maximum.");
      return;
    }
    if (minArea && maxArea && Number(minArea) > Number(maxArea)) {
      alert("La surface minimum ne peut pas être supérieure à la surface maximum.");
      return;
    }
    if (minNbrRooms && maxNbrRooms && Number(minNbrRooms) > Number(maxNbrRooms)) {
      alert(
        "Le nombre minimum de chambres ne peut pas être supérieur au nombre maximum."
      );
      return;
    }

    // Lance la recherche (si vous construisez l'URL ou relancez la requête)
    handleSearch();

    // Ferme la modal
    setOpen(false);
  }
  const handleClearFilters = () => {
    clearFilters();
    setOpen(false);
    router.push("/search");
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="w-11 h-11 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] border-none hover:brightness-110 flex items-center justify-center rounded-full aspect-square">
          <BiFilter className="w-8 h-8 text-white cursor-pointer" />
        </div>
      </DialogTrigger>

      <DialogContent
        style={{ borderRadius: "24px" }}
        className=" bg-white dark:bg-black text-black dark:text-white max-w-5xl mx-auto max-h-[700px] overflow-scroll rounded-2xl p-6 border-none"
      >
        <DialogHeader className="flex items-center gap-2 sticky top-0 bg-white dark:bg-black w-full">
          <DialogTitle className="text-xl font-bold">
            <div className="flex items-center gap-2">
              <ChevronLeft
                className="w-5 h-5 cursor-pointer"
                onClick={() => setOpen(false)}
              />
              <h2 className="text-2xl font-bold">Filtres de recherche</h2>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 mt-6">
          {/* Colonne gauche */}
          <div className="flex-1 space-y-6">
            {/* Ville */}
            <div>
              <label htmlFor="city-input" className="text-md font-bold mb-2 block">
                Ville
              </label>
              <Input
                id="city-input"
                placeholder="Entrez une ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-xl py-5 placeholder:text-gray dark:text-white text-black bg-white dark:bg-neutral-900 placeholder-gray-500 max-w-[350px] w-full"
              />
            </div>

            {/* Quartier */}
            <div>
              <label htmlFor="street-input" className="text-md font-bold mb-2 block">
                Quartier
              </label>
              <Input
                id="street-input"
                placeholder="Entrez un quartier"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="rounded-xl py-5 placeholder:text-gray dark:text-white text-black bg-white dark:bg-neutral-900 placeholder-gray-500 max-w-[350px] w-full"
              />
            </div>

            {/* Prix */}
            <div>
              <label className="text-md font-bold mb-2 block">Prix en F CFA</label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Prix min."
                  type="number"
                  //value={value.start}
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}

                  //onChange={(e) => { setValue((previous) => ({ start: Number(e.target.value), end: previous.end })) }}
                  className="rounded-xl py-5 dark:text-white text-black bg-white dark:bg-neutral-900 placeholder-gray-500 max-w-[90px] w-full"
                />
                <span>-</span>
                <Input
                  placeholder="Prix max."
                  type="number"
                  min={0}
                  //value={value.end}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}

                  //onChange={(e) => { setValue((previous) => ({ start: previous.start, end: Number(e.target.value) })) }}
                  className="rounded-xl py-5 dark:text-white text-black bg-white dark:bg-neutral-900 placeholder-gray-500 max-w-[90px] w-full"
                />
              </div>
            </div>

            {/* Surface */}
            <div>
              <label className="text-md font-bold mb-2 block">Surface (m²)</label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Surface min."
                  type="number"
                  value={minArea}
                  min={0}
                  onChange={(e) => setMinArea(e.target.value)}
                  className="rounded-xl py-5 dark:text-white text-black bg-white dark:bg-neutral-900 placeholder-gray-500 max-w-[90px] w-full"
                />
                <span>-</span>
                <Input
                  placeholder="Surface max."
                  type="number"
                  min={0}
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value)}
                  className="rounded-xl py-5 dark:text-white text-black bg-white dark:bg-neutral-900 placeholder-gray-500 max-w-[90px] w-full"
                />
              </div>
            </div>

            {/* Nombre de chambres */}
            <div>
              <label className="text-md font-bold mb-2 block">
                Nombre de chambres
              </label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Min."
                  type="number"
                  value={minNbrRooms}
                  min={0}
                  onChange={(e) => setMinNbrRooms(e.target.value)}
                  className="rounded-xl py-5 dark:text-white text-black bg-white dark:bg-neutral-900 placeholder-gray-500 max-w-[90px] w-full"
                />
                <span>-</span>
                <Input
                  placeholder="Max."
                  type="number"
                  min={0}
                  value={maxNbrRooms}
                  onChange={(e) => setMaxNbrRooms(e.target.value)}
                  className="rounded-xl py-5 dark:text-white text-black bg-white dark:bg-neutral-900 placeholder-gray-500 max-w-[90px] w-full"
                />
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="flex-1 space-y-6">
            {/* Type de propriété */}
            <div>
              <label className="text-md font-bold mb-2 block">
                Type de propriété
              </label>
              <div className="flex flex-wrap gap-3">
                {/* <RefinementList attribute={"typeProperty"} /> */}
                {Object.values(TypeProperty).map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    onClick={() => {
                      toggleSelection(typeProperty, getTypePropertyKey(type)!, setTypeProperty);
                      //typePropertyRefine((getTypePropertyKey(type) ?? ""));
                    }}
                    className={`rounded-full border-gray-600 font-semibold ${typeProperty.includes(getTypePropertyKey(type)!)
                      ? "bg-red-800 text-white"
                      : "text-gray-400"
                      }`}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-md font-bold mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-3">
                {tagsList.map((tag) => (
                  <Button
                    key={tag.tagName}
                    variant="outline"
                    onClick={() => { toggleSelection(tags, tag.tagName, setTags); refineTags(tag.tagName) }}
                    className={`rounded-full border-gray-600 font-semibold ${tags.includes(tag.tagName)
                      ? "bg-red-800 text-white"
                      : "text-gray-400"
                      }`}
                  >
                    {tag.tagName}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-8 flex gap-4 justify-end sticky bottom-0 bg-white dark:bg-black py-5">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="rounded-xl dark:text-white text-black border-gray-500 p-5"
          >
            Effacer les filtres
          </Button>
          <Button
            variant="default"
            className="bg-red-800 text-white rounded-xl p-5 hover:bg-red-800"
            onClick={handleApplyFilters}
          >
            Appliquer les filtres
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
