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
import { Button } from "@/components/ui/button";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { tags as tagsList } from "@/constantes";
import { DialogDescription } from "@radix-ui/react-dialog";
import { InputNumberApp } from "../shared/ui/InputNumberApp";
import { TypeProperty, getTypePropertyKey } from "@/constantes/property-type";
import { useFilterModal } from "@/hooks/use-filter-modal";
import { SelectFormApp } from "../shared/form/SelectFormApp";
import { useLocation } from "@/hooks/use-location";
import { useWatch } from "react-hook-form";
import { NumberInputRHF } from "../shared/ui/NumberInputRHF";
import { MultiSelect } from '@/components/shared/ui/MultiSelectApp';

const AREA_MIN = 0;
const AREA_MAX = 1000;
const ROOMS_MIN = 0;
const ROOMS_MAX = 10;

interface OptionType {
    label: string;
    value: string;
}

// Trie la liste des tags par ordre alphabétique
const sortedTagsList = [...tagsList].sort((a, b) => a.tagName.localeCompare(b.tagName));

// Trie la liste des types de propriété par ordre alphabétique
const sortedTypePropertyList = Object.values(TypeProperty)
    .map(type => ({
        label: type,
        value: getTypePropertyKey(type)!
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

export const FilterModalHomePage = () => {
    const { data: locations } = useLocation();
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
        clearFilters,
    } = useFilterModal();

    // Provinces triées
    const provinceOptions = React.useMemo(() => {
        if (!locations) return [];
        return Object.keys(locations)
            .sort((a, b) => a.localeCompare(b, 'fr'))
            .map(province => ({
                label: province,
                value: province
            }));
    }, [locations]);

    // Villes triées selon la province sélectionnée
    const cityOptions = React.useMemo(() => {
        if (!locations || localProvince.length === 0) return [];
        const province = localProvince[0];
        if (!province || !locations[province]) return [];
        return Object.keys(locations[province])
            .sort((a, b) => a.localeCompare(b, 'fr'))
            .map(city => ({
                label: city,
                value: city
            }));
    }, [locations, localProvince]);

    // Quartiers triés selon la ville sélectionnée
    const streetOptions = React.useMemo(() => {
        if (!locations || localProvince.length === 0 || localCity.length === 0) return [];
        const province = localProvince[0];
        const city = localCity[0];
        if (!province || !city || !locations[province][city]) return [];
        return locations[province][city]
            .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
            .map((street: string) => ({
                label: street,
                value: street
            }));
    }, [locations, localProvince, localCity]);

    const onClear = () => {
        clearLocalFilters();
        clearFilters();
    };

    const toggleLocal = (item: string, setter: (v: string[] | ((prev: string[]) => string[])) => void) => {
        setter(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div
                    className="p-2 rounded-full bg-gray-200 hover:bg-[#1FA89B]/20 transition cursor-pointer"
                    title="Ouvrir les filtres de recherche"
                >
                    <SlidersHorizontal />
                </div>
            </DialogTrigger>

            <DialogContent isDefaultIconClose={false} className="shadow-xl h-[90vh] max-w-[95%] md:max-w-4xl mx-auto flex flex-col rounded-2xl bg-white dark:bg-black overflow-hidden">
                {/* Header fixe */}
                <DialogHeader className="justify-between p-4 border-b bg-white dark:bg-black w-[98%]">
                    <div className="flex items-center gap-3">
                        <ChevronLeft
                            className="w-6 h-6 rounded-full border border-gray-500 cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                            onClick={() => setOpen(false)}
                        />
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold m-0 text-[#146B67]">
                            Filtres de recherche
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-gray-500">
                        Sélectionnez vos critères de recherche
                    </DialogDescription>
                </DialogHeader>

                {/* Contenu défilant */}
                <div className="flex-1 overflow-auto px-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Colonne Gauche */}
                    <div className="space-y-6">
                        {/* Province, Ville & Quartier */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <h1 className="text-lg mb-1 text-[#1FA89B] font-bold col-span-full">Secteur recherché</h1>
                            <div className="space-y-2">
                                <label htmlFor="province-input-home" className="text-gray-600">Province</label>
                                <MultiSelect
                                    key={localProvince.join('-')}
                                    options={provinceOptions}
                                    defaultValue={localProvince}
                                    onValueChange={setLocalProvince}
                                    placeholder="Sélectionnez une province"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="city-input-home" className="text-gray-600">Ville</label>
                                <MultiSelect
                                    key={localCity.join('-')}
                                    options={cityOptions}
                                    defaultValue={localCity}
                                    onValueChange={setLocalCity}
                                    placeholder="Sélectionnez une ville"
                                    disabled={localProvince.length === 0}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="street-input-home" className="text-gray-600">Quartier</label>
                                <MultiSelect
                                    key={localStreet.join('-')}
                                    options={streetOptions}
                                    defaultValue={localStreet}
                                    onValueChange={setLocalStreet}
                                    placeholder="Sélectionnez un quartier"
                                    disabled={localCity.length === 0}
                                />
                            </div> 
                        </div>

                        {/* Prix */}
                        <div className="space-y-2">
                            <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Prix (FCFA)</h1>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="min-price" className="text-gray-600">Prix min</label>
                                    <NumberInputRHF
                                        id="min-price"
                                        type="number"
                                        min={0}
                                        step={10000}
                                        value={localMinPrice === '' ? '' : Number(localMinPrice)}
                                        onChange={(value) => {
                                            if (isNaN(value)) {
                                                setLocalMinPrice('');
                                            } else {
                                                setLocalMinPrice(String(value));
                                            }
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="max-price" className="text-gray-600">Prix max</label>
                                    <NumberInputRHF
                                        id="max-price"
                                        type="number"
                                        min={0}
                                        step={10000}
                                        value={localMaxPrice === '' ? '' : Number(localMaxPrice)}
                                        onChange={(value) => {
                                            if (isNaN(value)) {
                                                setLocalMaxPrice('');
                                            } else {
                                                setLocalMaxPrice(String(value));
                                            }
                                        }}
                                        placeholder="1 000 000 000"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Surface */}
                        <div className="space-y-3">
                            <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Détails</h1>
                            <label htmlFor="area-slider-home" className="text-gray-600">Surface (m²)</label>
                            <SliderPrimitive.Root
                                key={`area-slider-home-${localMinArea}-${localMaxArea}`}
                                id="area-slider-home"
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
                                <SliderPrimitive.Track className="relative h-2 w-full rounded-full bg-[#E0F2F1]">
                                    <SliderPrimitive.Range className="absolute h-full bg-[#1FA89B]" />
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
                        <div className="space-y-3">
                            <label htmlFor="rooms-slider-home" className="text-gray-600">Chambres</label>
                            <SliderPrimitive.Root
                                key={`rooms-slider-home-${localMinRooms}-${localMaxRooms}`}
                                id="rooms-slider-home"
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
                                <SliderPrimitive.Track className="relative h-2 w-full rounded-full bg-[#E0F2F1]">
                                    <SliderPrimitive.Range className="absolute h-full bg-[#1FA89B]" />
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
                        <div className="space-y-3">
                            <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Type de propriété</h1>
                            <div className="flex flex-wrap gap-2">
                                {sortedTypePropertyList.map(type => {
                                    const sel = localTypes.includes(type.value);
                                    return (
                                        <Button
                                            key={`type-home-${type.value}-${sel}`}
                                            variant="outline"
                                            onClick={() => toggleLocal(type.value, setLocalTypes)}
                                            className={`px-3 py-1 rounded-full font-medium transition ${sel ? "bg-[#146B67] text-white" : "bg-gray-100 text-gray-700 border"
                                                }`}
                                        >
                                            {type.label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-3">
                            <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Tags</h1>
                            <div className="flex flex-wrap gap-2">
                                {sortedTagsList.map(tag => {
                                    const sel = localTags.includes(tag.tagName);
                                    return (
                                        <Button
                                            key={`tag-home-${tag.tagName}-${sel}`}
                                            variant="outline"
                                            onClick={() => toggleLocal(tag.tagName, setLocalTags)}
                                            className={`px-3 py-1 hover:bg-[#146B67] hover:text-white rounded-full font-medium transition ${sel ? "bg-[#146B67] text-white" : "bg-gray-100 text-gray-700 border"
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
                    <Button
                        variant="outline"
                        onClick={onClear}
                        className="w-full sm:w-auto border-[#146B67] text-[#146B67] hover:bg-[#1FA89B]/10 rounded-full"
                    >
                        Effacer
                    </Button>
                    <Button
                        variant="default"
                        onClick={onApply}
                        className="w-full sm:w-auto bg-[#146B67] hover:bg-[#1FA89B] text-white rounded-full"
                    >
                        Appliquer
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};