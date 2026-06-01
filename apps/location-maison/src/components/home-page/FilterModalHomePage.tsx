"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { statusOptions } from "@/constantes";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useFilterModal } from "@/hooks/use-filter-modal";
import { FormFilterSchema, FormFilterSchemaType } from "@/models/schema";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFormFilterSearchMediator } from "@/hooks/useFormFilterSearchMediator";
import { Form } from "../ui/form";
import SelectProvince from "../search/SelectProvince";
import SelectCity from "../search/SelectCity";
import SelectStreet from "../search/SelectStreet";
import MultiSelectFormApp from "../shared/form/MultiSelectFormApp";
import InputFormNumberApp from "../shared/form/InputFormNumberApp";
import { useAlgoliaTypePropertyOptions, useAlgoliaTagOptions } from "@/hooks/useAlgoliaFacetOptions";

export const FilterModalHomePage = () => {
    const form = useForm<FormFilterSchemaType>({
        resolver: zodResolver(FormFilterSchema)
    });
    const {
        // États
        open, setOpen,
        // Actions
        onApply,
    } = useFilterModal();

    const { onSubmit, onClear } = useFormFilterSearchMediator(form);
    const { options: typePropertyOptions } = useAlgoliaTypePropertyOptions();
    const { options: tagOptions } = useAlgoliaTagOptions();
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
                <DialogHeader className="justify-between p-4 border-b bg-white dark:bg-black w-full">
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

                <FormProvider {...form}>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-auto overflow-x-hidden px-4 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                            {/* Contenu défilant */}
                            <div className="flex-1 overflow-auto overflow-x-hidden px-4 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                                {/* Colonne Gauche */}
                                <div className="space-y-6">
                                    {/* Province, Ville & Quartier */}
                                    <div className="grid grid-cols-1 gap-3">
                                        <h1 className="text-lg mb-1 text-[#1FA89B] font-bold col-span-full">Secteur recherché</h1>
                                        <SelectProvince />
                                        <SelectCity />
                                        <SelectStreet />
                                    </div>

                                    {/* Statut (À vendre/À louer) */}
                                    <div className="space-y-3">
                                        <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Statut</h1>
                                        <MultiSelectFormApp
                                            control={form.control}
                                            name="status"
                                            options={statusOptions}
                                            placeholder="Sélectionnez le statut"
                                            className='rounded-full p-2 h-14 bg-gray-50 dark:bg-gray-900 dark:text-white'
                                            modalPopover
                                        />
                                    </div>

                                    {/* Prix */}
                                    <div className="space-y-2">
                                        <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Prix (FCFA)</h1>
                                        <div className="grid grid-cols-1 gap-4">
                                            <InputFormNumberApp
                                                control={form.control}
                                                name="minPrice"
                                                label="Prix min"
                                                step={10000}
                                                placeholder="0"
                                            />
                                            <InputFormNumberApp
                                                control={form.control}
                                                name="maxPrice"
                                                label="Prix max"
                                                step={10000}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Surface */}
                                    <div className="space-y-3">
                                        <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Surface (m²)</h1>
                                        <label htmlFor="area-slider-home" className="text-gray-600">Surface (m²)</label>
                                        <InputFormNumberApp
                                            control={form.control}
                                            name="minArea"
                                            label="Surface min"
                                            step={10}
                                            placeholder="0"
                                        />
                                        <InputFormNumberApp
                                            control={form.control}
                                            name="maxArea"
                                            label="Surface max"
                                            step={10}
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Chambres */}
                                    {/* <div className="space-y-3">
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
                                    </div> */}
                                </div>

                                {/* Colonne Droite */}
                                <div className="space-y-6">
                                    {/* Type de propriété */}
                                    <div className="space-y-3">
                                        <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Type d'annonces</h1>
                                        <MultiSelectFormApp
                                            control={form.control}
                                            name="typeProperty"
                                            options={typePropertyOptions}
                                            placeholder="Types d'annonces"
                                            className='rounded-full p-2 h-14 bg-gray-50 dark:bg-gray-900 dark:text-white'
                                            modalPopover
                                        />
                                    </div>

                                    {/* Tags */}
                                    <div className="space-y-3">
                                        <h1 className="text-lg mb-1 text-[#1FA89B] font-bold">Tags</h1>
                                        <MultiSelectFormApp
                                            control={form.control}
                                            name="tags"
                                            options={tagOptions}
                                            placeholder="Sélectionnez les tags"
                                            className='rounded-full p-2 h-14 bg-gray-50 dark:bg-gray-900 dark:text-white'
                                            modalPopover
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer fixe */}
                            <div className="flex justify-end items-center gap-2 sm:gap-4 p-4 border-t bg-white dark:bg-black sticky bottom-0 z-20">
                                <Button
                                    variant="outline"
                                    type="reset"
                                    onClick={onClear}
                                    className="w-full sm:w-auto border-[#146B67] text-[#146B67] hover:bg-[#1FA89B]/10 rounded-full text-sm"
                                >
                                    Effacer
                                </Button>
                                <Button
                                    variant="default"
                                    type="submit"
                                    onClick={onApply}
                                    className="w-full sm:w-auto bg-[#146B67] hover:bg-[#1FA89B] text-white rounded-full text-sm"
                                >
                                    Appliquer
                                </Button>
                            </div>
                        </form>
                    </Form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
};
