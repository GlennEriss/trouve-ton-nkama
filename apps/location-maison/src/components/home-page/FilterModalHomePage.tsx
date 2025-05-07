"use client";

import { useEffect, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { BiFilter } from "react-icons/bi";
import { useRouter } from "next/navigation";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { getTypePropertyKey, TypeProperty } from "@/lib/utils";
import { tags as tagsList } from "@/constantes";
import { useAlgoliaRefinements } from "@/providers/AlgoliaRefinementsContext";
import { DialogDescription } from "@radix-ui/react-dialog";
import { InputApp } from "../shared/ui/InputApp";
import { InputNumberApp } from "../shared/ui/InputNumberApp";

const PRICE_MIN = 0;
const PRICE_MAX = 1_000_000_000;
const AREA_MIN = 0;
const AREA_MAX = 1000;
const ROOMS_MIN = 0;
const ROOMS_MAX = 10;

export const FilterModalHomePage = () => {
    const router = useRouter();
    const { refineTags } = useAlgoliaRefinements();
    const {
        searchText,
        city, setCity,
        street, setStreet,
        minPrice, setMinPrice,
        maxPrice, setMaxPrice,
        minArea, setMinArea,
        maxArea, setMaxArea,
        minNbrRooms, setMinNbrRooms,
        maxNbrRooms, setMaxNbrRooms,
        typeProperty, setTypeProperty,
        tags, setTags,
        clearFilters,
    } = useAlgoliaContext();

    const [open, setOpen] = useState(false);

    const [localCity, setLocalCity] = useState(city);
    const [localStreet, setLocalStreet] = useState(street);
    const [localMinPrice, setLocalMinPrice] = useState(minPrice);
    const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);
    const [localMinArea, setLocalMinArea] = useState(minArea);
    const [localMaxArea, setLocalMaxArea] = useState(maxArea);
    const [localMinRooms, setLocalMinRooms] = useState(minNbrRooms);
    const [localMaxRooms, setLocalMaxRooms] = useState(maxNbrRooms);
    const [localTypes, setLocalTypes] = useState<string[]>(typeProperty);
    const [localTags, setLocalTags] = useState<string[]>(tags);

    useEffect(() => {
        if (open) {
            setLocalCity(city);
            setLocalStreet(street);
            setLocalMinPrice(minPrice);
            setLocalMaxPrice(maxPrice);
            setLocalMinArea(minArea);
            setLocalMaxArea(maxArea);
            setLocalMinRooms(minNbrRooms);
            setLocalMaxRooms(maxNbrRooms);
            setLocalTypes(typeProperty);
            setLocalTags(tags);
        }
    }, [open]);

    const clearLocalFilters = () => {
        setLocalCity("");
        setLocalStreet("");
        setLocalMinPrice("");
        setLocalMaxPrice("");
        setLocalMinArea("");
        setLocalMaxArea("");
        setLocalMinRooms("");
        setLocalMaxRooms("");
        setLocalTypes([]);
        setLocalTags([]);
    };

    const onClear = () => {
        clearLocalFilters();
    };

    const onApply = () => {
        let minP = Math.max(0, Number(localMinPrice) || 0);
        let maxP = Math.max(0, Number(localMaxPrice) || 0);
        if (minP >= maxP) {
            maxP = PRICE_MAX;
            setLocalMaxPrice(String(PRICE_MAX));
        }
        let minA = Math.max(0, Number(localMinArea) || 0);
        let maxA = Math.max(0, Number(localMaxArea) || 0);
        let minR = Math.max(0, Number(localMinRooms) || 0);
        let maxR = Math.max(0, Number(localMaxRooms) || 0);

        if (localCity) setCity(localCity);
        if (localStreet) setStreet(localStreet);
        if (localMinPrice) setMinPrice(String(minP));
        if (localMaxPrice) setMaxPrice(String(maxP));
        if (localMinArea) setMinArea(String(minA));
        if (localMaxArea) setMaxArea(String(maxA));
        if (localMinRooms) setMinNbrRooms(String(minR));
        if (localMaxRooms) setMaxNbrRooms(String(maxR));
        if (localTypes.length) setTypeProperty(localTypes);
        if (localTags.length) setTags(localTags);

        const params = new URLSearchParams();
        if (searchText) params.append("query", searchText);
        if (localCity) params.append("city", localCity);
        if (localStreet) params.append("street", localStreet);
        if (localMinPrice) params.append("minPrice", String(minP));
        if (localMaxPrice) params.append("maxPrice", String(maxP));
        if (localMinArea) params.append("minArea", localMinArea);
        if (localMaxArea) params.append("maxArea", localMaxArea);
        if (localMinRooms) params.append("minNbrRooms", localMinRooms);
        if (localMaxRooms) params.append("maxNbrRooms", localMaxRooms);
        if (localTypes.length) params.append("typeProperty", localTypes.join(","));
        if (localTags.length) params.append("tags", localTags.join(","));
        router.push(`/search?${params.toString()}`);

        setOpen(false);
    };

    const toggleLocal = (item: string, setter: (v: string[] | ((prev: string[]) => string[])) => void) => {
        setter(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const priceInvalid = Number(localMinPrice) < 0 || Number(localMaxPrice) < 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type='button'
                    title="Ouvrir les filtres de recherche"
                    className=" p-2 rounded-full bg-gray-200 hover:bg-[#1FA89B]/20 transition"
                >
                    <SlidersHorizontal />
                </button>
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
                        {/* Ville & Quartier */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Secteur recherché</h1>
                            <div className="space-y-2">
                                <label className="text-gray-600">Saisissez une Ville</label>
                                <InputApp
                                    value={localCity}
                                    onChange={e => setLocalCity(e.target.value)}
                                    placeholder="Entrez une ville"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-600">Saisissez un quartier</label>
                                <InputApp
                                    value={localStreet}
                                    onChange={e => setLocalStreet(e.target.value)}
                                    placeholder="Entrez un quartier"
                                />
                            </div>
                        </div>

                        {/* Prix */}
                        <div className="space-y-2">
                            <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Prix (FCFA)</h1>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="min-price" className="text-gray-600">Prix min</label>
                                    <InputNumberApp
                                        id="min-price"
                                        type="number"
                                        min={0}
                                        step={10000}
                                        defaultValue={Number(localMinPrice)}
                                        personalizedOnChange={(value) =>
                                            setLocalMinPrice(String(Math.max(0, value)))
                                        }
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="max-price" className="text-gray-600">Prix max</label>
                                    <InputNumberApp
                                        id="max-price"
                                        type="number"
                                        min={0}
                                        step={10000}
                                        defaultValue={Number(localMaxPrice)}
                                        personalizedOnChange={(value) =>
                                            setLocalMaxPrice(String(Math.max(0, value)))
                                        }
                                        placeholder="1 000 000 000"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Surface */}
                        <div className="space-y-3">
                            <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Détails</h1>
                            <label className="text-gray-600">Surface (m²)</label>
                            <SliderPrimitive.Root
                                value={[Number(localMinArea) || AREA_MIN, Number(localMaxArea) || AREA_MAX]}
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
                            <label className="text-gray-600">Chambres</label>
                            <SliderPrimitive.Root
                                value={[Number(localMinRooms) || ROOMS_MIN, Number(localMaxRooms) || ROOMS_MAX]}
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
                                {Object.values(TypeProperty).map(type => {
                                    const key = getTypePropertyKey(type)!;
                                    const sel = localTypes.includes(key);
                                    return (
                                        <Button
                                            key={key}
                                            variant="outline"
                                            onClick={() => toggleLocal(key, setLocalTypes)}
                                            className={`px-3 py-1 rounded-full font-medium transition ${sel ? "bg-[#146B67] text-white" : "bg-gray-100 text-gray-700 border"
                                                }`}
                                        >
                                            {type}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-3">
                            <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Tags</h1>
                            <div className="flex flex-wrap gap-2">
                                {tagsList.map(tag => {
                                    const sel = localTags.includes(tag.tagName);
                                    return (
                                        <Button
                                            key={tag.tagName}
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