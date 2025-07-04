"use client";

import React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
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
import { tags as tagsList } from "@/constantes";
import { TypeProperty, getTypePropertyKey } from "@/constantes/property-type";
import { useFilterModal } from "@/hooks/use-filter-modal";

const PRICE_MIN = 0;
const AREA_MIN = 0;
const AREA_MAX = 1000;
const ROOMS_MIN = 0;
const ROOMS_MAX = 10;

export const FilterModal = () => {
  const {
    // États
    open, setOpen,
    localProvince, setLocalProvince,
    localCity, setLocalCity,
    localStreet, setLocalStreet,
    localMinPrice, setLocalMinPrice,
    localMaxPrice, setLocalMaxPrice,
    localMinArea, setLocalMinArea,
    localMaxArea, setLocalMaxArea,
    localMinRooms, setLocalMinRooms,
    localMaxRooms, setLocalMaxRooms,
    localTypes, setLocalTypes,
    localTags, setLocalTags,
    
    // Actions
    clearLocalFilters,
    onApply,
    toggleLocal,
  } = useFilterModal();

  const onClear = () => {
    clearLocalFilters();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] rounded-full hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1FA89B]"
        >
          <BiFilter className="w-5 h-5 text-white" />
          <span className="text-white font-semibold">Filtrer</span>
        </button>
      </DialogTrigger>

      <DialogContent className="h-[90vh] max-w-[95%] md:max-w-4xl mx-auto flex flex-col rounded-2xl bg-white dark:bg-black overflow-hidden">
        {/* Header fixe */}
        <DialogHeader className="flex items-center justify-between p-4 border-b bg-white dark:bg-black sticky top-0 z-20  w-[98%]">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold m-0">
            <ChevronLeft
              className="w-6 h-6 cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              onClick={() => setOpen(false)}
            />
            Filtres de recherche
          </DialogTitle>
        </DialogHeader>

        {/* Contenu défilant */}
        <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne Gauche */}
          <div className="space-y-6">
            {/* Province, Ville & Quartier */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="province-input" className="block font-semibold mb-1">Province</label>
                <Input
                  key={`province-${localProvince}`}
                  id="province-input"
                  value={localProvince}
                  onChange={e => setLocalProvince(e.target.value)}
                  placeholder="Entrez une province"
                />
              </div>
              <div>
                <label htmlFor="city-input" className="block font-semibold mb-1">Ville</label>
                <Input
                  key={`city-${localCity}`}
                  id="city-input"
                  value={localCity}
                  onChange={e => setLocalCity(e.target.value)}
                  placeholder="Entrez une ville"
                />
              </div>
              <div>
                <label htmlFor="street-input" className="block font-semibold mb-1">Quartier</label>
                <Input
                  key={`street-${localStreet}`}
                  id="street-input"
                  value={localStreet}
                  onChange={e => setLocalStreet(e.target.value)}
                  placeholder="Entrez un quartier"
                />
              </div>
            </div>

            {/* Prix */}
            <div className="space-y-2">
              <label htmlFor="price-range" className="block font-semibold mb-1">Prix (F CFA)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="min-price" className="text-sm">Prix min</label>
                  <Input
                    key={`min-price-${localMinPrice}`}
                    id="min-price"
                    type="number"
                    min={0}
                    value={localMinPrice}
                    onChange={e => setLocalMinPrice(
                      String(Math.max(0, Number(e.target.value)))
                    )}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="max-price" className="text-sm">Prix max</label>
                  <Input
                    key={`max-price-${localMaxPrice}`}
                    id="max-price"
                    type="number"
                    min={0}
                    value={localMaxPrice}
                    onChange={e => setLocalMaxPrice(
                      String(Math.max(0, Number(e.target.value)))
                    )}
                    placeholder="1 000 000 000"
                  />
                </div>
              </div>
            </div>

            {/* Surface */}
            <div>
              <label htmlFor="area-slider" className="block font-semibold mb-2">Surface (m²)</label>
              <SliderPrimitive.Root
                key={`area-slider-${localMinArea}-${localMaxArea}`}
                id="area-slider"
                value={[
                  localMinArea ? Number(localMinArea) : AREA_MIN, 
                  localMaxArea ? Number(localMaxArea) : AREA_MAX
                ]}
                onValueChange={([low, high]) => {
                  setLocalMinArea(low.toString());
                  setLocalMaxArea(high.toString());
                }}
                min={AREA_MIN} max={AREA_MAX} step={5}
                className="relative flex items-center select-none"
              >
                <SliderPrimitive.Track className="relative h-2 w-full rounded-full bg-primary/20">
                  <SliderPrimitive.Range className="absolute h-full bg-primary" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border bg-background shadow" />
                <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border bg-background shadow" />
              </SliderPrimitive.Root>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{localMinArea || AREA_MIN} m²</span>
                <span>{localMaxArea || AREA_MAX} m²</span>
              </div>
            </div>

            {/* Chambres */}
            <div>
              <label htmlFor="rooms-slider" className="block font-semibold mb-2">Chambres</label>
              <SliderPrimitive.Root
                key={`rooms-slider-${localMinRooms}-${localMaxRooms}`}
                id="rooms-slider"
                value={[
                  localMinRooms ? Number(localMinRooms) : ROOMS_MIN, 
                  localMaxRooms ? Number(localMaxRooms) : ROOMS_MAX
                ]}
                onValueChange={([low, high]) => {
                  setLocalMinRooms(low.toString());
                  setLocalMaxRooms(high.toString());
                }}
                min={ROOMS_MIN} max={ROOMS_MAX} step={1}
                className="relative flex items-center select-none"
              >
                <SliderPrimitive.Track className="relative h-2 w-full rounded-full bg-primary/20">
                  <SliderPrimitive.Range className="absolute h-full bg-primary" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border bg-background shadow" />
                <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border bg-background shadow" />
              </SliderPrimitive.Root>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{localMinRooms || ROOMS_MIN}</span>
                <span>{localMaxRooms || ROOMS_MAX}</span>
              </div>
            </div>
          </div>

          {/* Colonne Droite */}
          <div className="space-y-6">
            {/* Type de propriété */}
            <div>
              <label htmlFor="property-types" className="block font-semibold mb-2">Type de propriété</label>
              <div id="property-types" className="flex flex-wrap gap-2">
                {Object.values(TypeProperty).map(type => {
                  const key = getTypePropertyKey(type)!;
                  const sel = localTypes.includes(key);
                  return (
                    <Button
                      key={`type-${key}-${sel}`}
                      variant="outline"
                      onClick={() => toggleLocal(localTypes, key, setLocalTypes)}
                      className={`px-3 py-1 rounded-full font-medium transition ${sel ? "bg-red-800 text-white" : "border-gray-400 text-gray-600"
                        } hover:${sel ? "bg-red-800 text-white" : "border-gray-400 text-gray-600"
                        } focus:${sel ? "bg-red-800 text-white" : "border-gray-400 text-gray-600"
                        }`}
                    >
                      {type}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags-list" className="block font-semibold mb-2">Tags</label>
              <div id="tags-list" className="flex flex-wrap gap-2">
                {tagsList.map(tag => {
                  const sel = localTags.includes(tag.tagName);
                  return (
                    <Button
                      key={`tag-${tag.tagName}-${sel}`}
                      variant="outline"
                      onClick={() => {
                        toggleLocal(localTags, tag.tagName, setLocalTags);
                      }}
                      className={`px-3 py-1 rounded-full font-medium transition ${sel ? "bg-red-800 text-white" : "border-gray-400 text-gray-600"
                      } hover:${sel ? "bg-red-800 text-white" : "border-gray-400 text-gray-600"
                      } focus:${sel ? "bg-red-800 text-white" : "border-gray-400 text-gray-600"
                      }`}
                    >
                      {tag.tagName}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer fixe */}
        <div className="flex justify-end items-center gap-4 p-4 border-t bg-white dark:bg-black sticky bottom-0 z-20">
          <Button variant="outline" onClick={onClear} className="w-full sm:w-auto">
            Effacer
          </Button>
          <Button
            variant="default"
            onClick={onApply}
            className="w-full sm:w-auto"
          >
            Appliquer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};