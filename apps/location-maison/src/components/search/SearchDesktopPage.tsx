'use client'

import React from 'react'
import { SelectFormApp } from '../shared/form/SelectFormApp'
import { Form } from '../ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormFilterSchema, FormFilterSchemaType } from '@/models/schema'
import { useForm } from 'react-hook-form'
import { useLocation } from '@/hooks/use-location'
import InputFormNumberApp from '../shared/form/InputFormNumberApp'
import MultiSelectFormApp from '../shared/form/MultiSelectFormApp'
import { getTypePropertyKey, TypeProperty } from '@/lib/utils'
import { tags as tagsList } from "@/constantes";
import { Button } from '../ui/button'
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { useConfigure, useInfiniteHits } from 'react-instantsearch'
import Image from 'next/image'
import PropertyCard from '../home-page/PropertyCard'
import { useRouter } from 'next/navigation'

interface OptionType {
    label: string;
    value: string;
}

export default function SearchDesktopPage() {
    const { data: locations } = useLocation();
    const { items, isLastPage, showMore } = useInfiniteHits();
    const router = useRouter();

    const {
        searchText, setSearchText,
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
    const form = useForm<FormFilterSchemaType>({
        resolver: zodResolver(FormFilterSchema)
    });

    // Observer la sélection de la province
    const selectedProvince = form.watch('province');

    // Observer la sélection de la ville
    const selectedCity = form.watch('city');

    // Réinitialiser city et street quand la province change
    React.useEffect(() => {
        form.setValue('city', '');
        form.setValue('street', '');
    }, [selectedProvince, form]);

    // Réinitialiser street quand la ville change
    React.useEffect(() => {
        form.setValue('street', '');
    }, [selectedCity, form]);

    // Générer les options des provinces triées alphabétiquement
    const provinceOptions = React.useMemo((): OptionType[] => {
        if (!locations) return [];
        return Object.keys(locations)
            .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
            .map((province: string): OptionType => ({
                label: province,
                value: province
            }));
    }, [locations]);

    // Générer les options des villes triées alphabétiquement
    const cityOptions = React.useMemo((): OptionType[] => {
        if (!locations || !selectedProvince || !locations[selectedProvince]) {
            return [];
        }
        return Object.keys(locations[selectedProvince])
            .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
            .map((city: string): OptionType => ({
                label: city,
                value: city
            }));
    }, [locations, selectedProvince]);

    // Générer les options des quartiers triées alphabétiquement
    const streetOptions = React.useMemo((): OptionType[] => {
        if (!selectedProvince) {
            return []
        }
        if (!locations || !selectedCity || !locations[selectedProvince][selectedCity]) {
            return [];
        }
        return locations[selectedProvince][selectedCity]
            .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
            .map((street: string): OptionType => ({
                label: street,
                value: street
            }));
    }, [locations, selectedProvince, selectedCity]);

    const onClear = () => {
        // Reset du formulaire React Hook Form
        form.reset({
            province: '',
            city: '',
            street: '',
            minPrice: undefined,
            maxPrice: undefined,
            minArea: undefined,
            maxArea: undefined,
            minNbrRooms: undefined,
            maxNbrRooms: undefined,
            typeProperty: [],
            tags: []
        });

        // Reset du contexte Algolia
        clearFilters();

        // Reset de l'URL
        router.push('/search');
    };
    const onSubmit = (data: FormFilterSchemaType) => {
        // Validation et normalisation des valeurs
        let minPrice = Math.max(0, Number(data.minPrice) || 0);
        let maxPrice = Math.max(0, Number(data.maxPrice) || 0);
        if (minPrice >= maxPrice) {
            maxPrice = Infinity;
            form.setValue('maxPrice', maxPrice);
        }

        let minArea = Math.max(0, Number(data.minArea) || 0);
        let maxArea = Math.max(0, Number(data.maxArea) || 0);
        let minRooms = Math.max(0, Number(data.minNbrRooms) || 0);
        let maxRooms = Math.max(0, Number(data.maxNbrRooms) || 0);

        // Mise à jour du contexte
        if (data.city) setCity(data.city);
        if (data.street) setStreet(data.street);
        if (data.minPrice) setMinPrice(String(minPrice));
        if (data.maxPrice) setMaxPrice(String(maxPrice));
        if (data.minArea) setMinArea(String(minArea));
        if (data.maxArea) setMaxArea(String(maxArea));
        if (data.minNbrRooms) setMinNbrRooms(String(minRooms));
        if (data.maxNbrRooms) setMaxNbrRooms(String(maxRooms));
        if (data.typeProperty?.length) setTypeProperty(data.typeProperty);
        if (data.tags?.length) setTags(data.tags);

        // Construction et mise à jour de l'URL
        const params = new URLSearchParams();
        if (searchText) params.append("query", searchText);
        if (data.city) params.append("city", data.city);
        if (data.street) params.append("street", data.street);
        if (minPrice) params.append("minPrice", String(minPrice));
        if (maxPrice && maxPrice !== Infinity) params.append("maxPrice", String(maxPrice));
        if (minArea) params.append("minArea", String(minArea));
        if (maxArea) params.append("maxArea", String(maxArea));
        if (minRooms) params.append("minNbrRooms", String(minRooms));
        if (maxRooms) params.append("maxNbrRooms", String(maxRooms));
        if (data.typeProperty?.length) params.append("typeProperty", data.typeProperty.join(","));
        if (data.tags?.length) params.append("tags", data.tags.join(","));

        router.push(`/search?${params.toString()}`);
    };
    return (
        <div className='flex p-5'>
            <div className="w-1/4 border border-gray-200 dark:border-gray-700 bg-white relative">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="h-[calc(100vh-40px)] flex flex-col">
                        <div className='border-b border-gray-200 dark:border-gray-700 p-5 flex items-center justify-center'>
                            <h1 className='text-2xl font-bold text-[#146B67] text-center'>
                                Filtres de recherches
                            </h1>
                        </div>
                        <div className="flex-1 overflow-auto mb-20">
                            <section>

                                <div className='space-y-5 p-5'>
                                    <h2 className='text-lg font-semibold text-[#146B67]'>
                                        Secteur recherché
                                    </h2>
                                    <SelectFormApp
                                        control={form.control}
                                        id="province"
                                        name="province"
                                        label="Province"
                                        options={provinceOptions}
                                        placeholder="Sélectionnez une province"
                                    />
                                    <SelectFormApp
                                        control={form.control}
                                        id="city"
                                        name="city"
                                        label="Ville"
                                        options={cityOptions}
                                        placeholder="Sélectionnez une ville"
                                        disabled={!selectedProvince}
                                    />
                                    <SelectFormApp
                                        control={form.control}
                                        id="street"
                                        name="street"
                                        label="Quartier"
                                        options={streetOptions}
                                        placeholder="Sélectionnez un quartier"
                                        disabled={!selectedCity}
                                    />
                                </div>
                            </section>

                            <section className='space-y-5 p-5'>
                                <h2 className='text-lg font-semibold text-[#146B67]'>
                                    Prix (FCFA)
                                </h2>
                                <InputFormNumberApp
                                    control={form.control}
                                    id="minPrice"
                                    name="minPrice"
                                    label="Prix min"
                                    step={10000}
                                    placeholder="0"
                                />
                                <InputFormNumberApp
                                    control={form.control}
                                    id="maxPrice"
                                    name="maxPrice"
                                    label="Prix max"
                                    step={10000}
                                    placeholder="0"
                                />
                            </section>

                            <section className='space-y-5 p-5'>
                                <h2 className='text-lg font-semibold text-[#146B67]'>
                                    Surface (m²)
                                </h2>
                                <InputFormNumberApp
                                    control={form.control}
                                    id="minArea"
                                    name="minArea"
                                    label="Surface min"
                                    step={10}
                                    placeholder="0"
                                />
                                <InputFormNumberApp
                                    control={form.control}
                                    id="maxArea"
                                    name="maxArea"
                                    label="Surface max"
                                    step={10}
                                    placeholder="0"
                                />
                            </section>

                            <section className='space-y-5 p-5'>
                                <h2 className='text-lg font-semibold text-[#146B67]'>
                                    Types de propriété
                                </h2>
                                <MultiSelectFormApp
                                    control={form.control}
                                    name="typeProperty"
                                    options={Object.values(TypeProperty).map(type => ({
                                        label: type,
                                        value: getTypePropertyKey(type)!
                                    }))}
                                    placeholder="Types de propriété"
                                    className='rounded-full p-2 h-14 bg-gray-50 dark:bg-gray-900 dark:text-white'
                                />
                            </section>

                            <section className='space-y-5 p-5'>
                                <h2 className='text-lg font-semibold text-[#146B67]'>
                                    Tags
                                </h2>
                                <MultiSelectFormApp
                                    control={form.control}
                                    name="tags"
                                    options={tagsList.map(tag => ({
                                        label: tag.tagName,
                                        value: tag.tagName
                                    }))}
                                    placeholder="Sélectionnez les tags"
                                    className='rounded-full p-2 h-14 bg-gray-50 dark:bg-gray-900 dark:text-white'
                                />
                            </section>
                        </div>

                        <div className="sticky bottom-0 bg-white p-5 border-t border-gray-200 space-y-3">
                            <Button
                                variant="outline"
                                type="reset"
                                onClick={onClear}
                                className="w-full border-[#146B67] text-[#146B67] hover:bg-[#1FA89B]/10 rounded-full mb-2"
                            >
                                Effacer
                            </Button>
                            <Button
                                variant="default"
                                type="submit"
                                className="w-full bg-[#146B67] hover:bg-[#1FA89B] text-white rounded-full"
                            >
                                Appliquer
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
            <div className="w-3/4 flex flex-col h-screen pb-20">
                <div className="p-5 flex-1 overflow-auto">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-xl p-8">
                            <Image
                                src="/no-favorites.svg"
                                alt="Aucun résultat trouvé"
                                width={240}
                                height={240}
                                className="opacity-70"
                            />
                            <p className="mt-6 text-gray-600 dark:text-gray-400 text-lg text-center">
                                Aucun bien ne correspond à ces critères.
                            </p>
                            <button
                                onClick={clearFilters}
                                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-full hover:brightness-110 transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                    {items.length} {items.length > 1 ? 'propriétés trouvées' : 'propriété trouvée'}
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                {items.map((propertyData, i) => (
                                    <div 
                                        key={propertyData.objectID}
                                        className="transform transition-all duration-300 hover:translate-y-[-4px]"
                                    >
                                        <PropertyCard 
                                            property={propertyData} 
                                            index={i} 
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {!isLastPage && items.length > 0 && (
                    <div className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900">
                        <div className="flex justify-center">
                            <button
                                onClick={showMore}
                                className="px-8 py-3 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-full font-medium hover:brightness-110 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <span>Voir plus de propriétés</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

    )
}
