'use client'

import React from 'react'
import { SelectFormApp } from '../shared/form/SelectFormApp'
import { Form } from '../ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormFilterSchema, FormFilterSchemaType } from '@/models/schema'
import { useForm, useWatch } from 'react-hook-form'
import { useLocation } from '@/hooks/use-location'
import InputFormNumberApp from '../shared/form/InputFormNumberApp'
import MultiSelectFormApp from '../shared/form/MultiSelectFormApp'
import { tags as tagsList, statusOptions } from "@/constantes";
import { Button } from '../ui/button'
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { useInfiniteHits, useStats } from 'react-instantsearch'
import Image from 'next/image'
import PropertyCard from '../home-page/PropertyCard'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { TypeProperty, getTypePropertyKey } from '@/constantes/property-type'

interface OptionType {
    label: string;
    value: string;
}

export default function SearchDesktopPage() {
    const { data: locations } = useLocation();
    const { items, isLastPage, showMore } = useInfiniteHits();
    const { nbHits } = useStats();
    const router = useRouter();
    const searchParams = useSearchParams();

    const {
        searchText,
        setProvince,
        setCity,
        setStreet,
        setMinPrice,
        setMaxPrice,
        setMinArea,
        setMaxArea,
        setMinNbrRooms,
        setMaxNbrRooms,
        setTypeProperty,
        setStatus,
        setTags,
        clearFilters,
    } = useAlgoliaContext();
    const form = useForm<FormFilterSchemaType>({
        resolver: zodResolver(FormFilterSchema)
    });

    // État pour éviter les conflits entre URL et interactions utilisateur
    const [isInitialLoad, setIsInitialLoad] = React.useState(true);
    // Key pour forcer le re-render des selects quand les valeurs sont synchronisées
    const [formKey, setFormKey] = React.useState(0);

    // Synchronisation URL → Contexte Algolia au chargement initial
    React.useEffect(() => {
        // Attendre que les données locations soient chargées avant la synchronisation
        if (!locations) return;

        const provinceVal = searchParams.get("province") ?? "";
        const cityVal = searchParams.get("city") ?? "";
        const streetVal = searchParams.get("street") ?? "";
        const minPriceVal = searchParams.get("minPrice") ?? "";
        const maxPriceVal = searchParams.get("maxPrice") ?? "";
        const minAreaVal = searchParams.get("minArea") ?? "";
        const maxAreaVal = searchParams.get("maxArea") ?? "";
        const minRoomsVal = searchParams.get("minNbrRooms") ?? "";
        const maxRoomsVal = searchParams.get("maxNbrRooms") ?? "";
        const typePropRaw = searchParams.get("typeProperty");
        const statusRaw = searchParams.get("status");
        const tagsRaw = searchParams.get("tags");

        // Debug log pour vérifier la synchronisation
        // console.log('🔄 Synchronisation URL→Form:', { provinceVal, cityVal });

        // Mettre à jour le contexte Algolia
        setProvince(provinceVal);
        setCity(cityVal);
        setStreet(streetVal);
        setMinPrice(minPriceVal);
        setMaxPrice(maxPriceVal);
        setMinArea(minAreaVal);
        setMaxArea(maxAreaVal);
        setMinNbrRooms(minRoomsVal);
        setMaxNbrRooms(maxRoomsVal);
        setTypeProperty(typePropRaw ? typePropRaw.split(",").map(s => s.trim()) : []);
        setStatus(statusRaw ? statusRaw.split(",").map(s => s.trim()) : []);
        setTags(tagsRaw ? tagsRaw.split(",").map(s => s.trim()) : []);

        // Mettre à jour le formulaire avec un délai pour s'assurer que le render est terminé
        setTimeout(() => {
            // Vérifier que la province existe dans les options avant de l'appliquer
            const validProvince = provinceVal && locations[provinceVal] ? provinceVal : '';
            const validCity = cityVal && validProvince && locations[validProvince]?.[cityVal] ? cityVal : '';
            const validStreet = streetVal && validCity && validProvince && locations[validProvince]?.[cityVal]?.includes(streetVal) ? streetVal : '';


            form.setValue('province', validProvince);
            form.setValue('city', validCity);
            form.setValue('street', validStreet);
            form.setValue('minPrice', minPriceVal ? Number(minPriceVal) : undefined);
            form.setValue('maxPrice', maxPriceVal ? Number(maxPriceVal) : undefined);
            form.setValue('minArea', minAreaVal ? Number(minAreaVal) : undefined);
            form.setValue('maxArea', maxAreaVal ? Number(maxAreaVal) : undefined);
            form.setValue('minNbrRooms', minRoomsVal ? Number(minRoomsVal) : undefined);
            form.setValue('maxNbrRooms', maxRoomsVal ? Number(maxRoomsVal) : undefined);
            form.setValue('typeProperty', typePropRaw ? typePropRaw.split(",").map(s => s.trim()) : []);
            form.setValue('status', statusRaw ? statusRaw.split(",").map(s => s.trim()) : []);
            form.setValue('tags', tagsRaw ? tagsRaw.split(",").map(s => s.trim()) : []);
            
            // Marquer le chargement initial comme terminé et forcer re-render
            setIsInitialLoad(false);
            setFormKey(prev => prev + 1);
        }, 100);
    }, [searchParams.toString(), locations, setProvince, setCity, setStreet, setMinPrice, setMaxPrice, setMinArea, setMaxArea, setMinNbrRooms, setMaxNbrRooms, setTypeProperty, setTags, form]);

    // Observer la sélection de la province et ville avec useWatch pour meilleure réactivité
    const selectedProvince = useWatch({
        control: form.control,
        name: 'province'
    });

    const selectedCity = useWatch({
        control: form.control,
        name: 'city'
    });

    // Debug pour voir les valeurs du formulaire
    // React.useEffect(() => {
    //     console.log('🔍 Valeurs du formulaire:', {
    //         province: selectedProvince,
    //         city: selectedCity,
    //         formValues: form.getValues()
    //     });
    // }, [selectedProvince, selectedCity, form]);

    // Réinitialiser city et street quand la province change (seulement après le chargement initial)
    React.useEffect(() => {
        if (!isInitialLoad && selectedProvince && locations) {
            
            // Vérifier si la ville actuelle est valide pour la nouvelle province
            const currentCity = form.getValues('city');
            
            if (currentCity && !locations[selectedProvince]?.[currentCity]) {
                form.setValue('city', '');
                form.setValue('street', '');
            }
        }
    }, [selectedProvince, form, isInitialLoad, locations]);

    // Réinitialiser street quand la ville change (seulement après le chargement initial)
    React.useEffect(() => {
        if (!isInitialLoad && selectedCity && selectedProvince && locations) {
            // Vérifier si le quartier actuel est valide pour la nouvelle ville
            const currentStreet = form.getValues('street');
            if (currentStreet && !locations[selectedProvince]?.[selectedCity]?.includes(currentStreet)) {
                // console.log('❌ Quartier invalide, réinitialisation:', currentStreet);
                form.setValue('street', '');
            }
        }
    }, [selectedCity, form, isInitialLoad, selectedProvince, locations]);

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
        // Reset des valeurs du formulaire
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

    // Fonction pour normaliser et valider les valeurs numériques
    const normalizeValues = (data: FormFilterSchemaType) => {
        let minPrice = Math.max(0, Number(data.minPrice) || 0);
        let maxPrice = Math.max(0, Number(data.maxPrice) || 0);
        
        if (minPrice >= maxPrice) {
            maxPrice = Infinity;
            form.setValue('maxPrice', maxPrice);
        }

        const minArea = Math.max(0, Number(data.minArea) || 0);
        const maxArea = Math.max(0, Number(data.maxArea) || 0);
        const minRooms = Math.max(0, Number(data.minNbrRooms) || 0);
        const maxRooms = Math.max(0, Number(data.maxNbrRooms) || 0);

        return { minPrice, maxPrice, minArea, maxArea, minRooms, maxRooms };
    };

    // Fonction pour mettre à jour le contexte
    const updateContext = (data: FormFilterSchemaType, normalizedValues: ReturnType<typeof normalizeValues>) => {
        const { minPrice, maxPrice, minArea, maxArea, minRooms, maxRooms } = normalizedValues;

        const contextUpdates = [
            { condition: data.province, setter: setProvince, value: data.province },
            { condition: data.city, setter: setCity, value: data.city },
            { condition: data.street, setter: setStreet, value: data.street },
            { condition: data.minPrice, setter: setMinPrice, value: String(minPrice) },
            { condition: data.maxPrice, setter: setMaxPrice, value: String(maxPrice) },
            { condition: data.minArea, setter: setMinArea, value: String(minArea) },
            { condition: data.maxArea, setter: setMaxArea, value: String(maxArea) },
            { condition: data.minNbrRooms, setter: setMinNbrRooms, value: String(minRooms) },
            { condition: data.maxNbrRooms, setter: setMaxNbrRooms, value: String(maxRooms) },
        ];

        const arrayUpdates = [
            { condition: data.typeProperty?.length, setter: setTypeProperty, value: data.typeProperty },
            { condition: data.status?.length, setter: setStatus, value: data.status },
            { condition: data.tags?.length, setter: setTags, value: data.tags },
        ];

        contextUpdates.forEach(({ condition, setter, value }) => {
            if (condition) setter(value as string);
        });

        arrayUpdates.forEach(({ condition, setter, value }) => {
            if (condition) setter(value as string[]);
        });
    };

    // Fonction pour construire les paramètres URL
    const buildUrlParams = (data: FormFilterSchemaType, normalizedValues: ReturnType<typeof normalizeValues>) => {
        const { minPrice, maxPrice, minArea, maxArea, minRooms, maxRooms } = normalizedValues;
        const params = new URLSearchParams();

        const paramMappings = [
            { condition: searchText, key: "query", value: searchText },
            { condition: data.province, key: "province", value: data.province },
            { condition: data.city, key: "city", value: data.city },
            { condition: data.street, key: "street", value: data.street },
            { condition: minPrice, key: "minPrice", value: String(minPrice) },
            { condition: maxPrice && maxPrice !== Infinity, key: "maxPrice", value: String(maxPrice) },
            { condition: minArea, key: "minArea", value: String(minArea) },
            { condition: maxArea, key: "maxArea", value: String(maxArea) },
            { condition: minRooms, key: "minNbrRooms", value: String(minRooms) },
            { condition: maxRooms, key: "maxNbrRooms", value: String(maxRooms) },
            { condition: data.typeProperty?.length, key: "typeProperty", value: data.typeProperty?.join(",") },
            { condition: data.status?.length, key: "status", value: data.status?.join(",") },
            { condition: data.tags?.length, key: "tags", value: data.tags?.join(",") },
        ];

        paramMappings.forEach(({ condition, key, value }) => {
            if (condition && value) params.append(key, value);
        });

        return params;
    };

    const onSubmit = (data: FormFilterSchemaType) => {
        const normalizedValues = normalizeValues(data);
        updateContext(data, normalizedValues);
        
        const params = buildUrlParams(data, normalizedValues);
        router.push(`/search?${params.toString()}`);
    };

    return (
        <div className='flex p-5'>
            <div className="w-1/4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="h-[calc(100vh-40px)] flex flex-col">
                        <div className='border-b border-gray-200 dark:border-gray-700 p-5 flex items-center justify-center'>
                            <h1 className='text-2xl font-bold text-[#146B67] dark:text-[#1FA89B] text-center'>
                                Filtres de recherches
                            </h1>
                        </div>
                        <div className="flex-1 overflow-auto mb-20">
                            <section>
                                <div className='space-y-5 p-5'>
                                    <h2 className='text-lg font-semibold text-[#146B67] dark:text-[#1FA89B]'>
                                        Secteur recherché
                                    </h2>
                                    <SelectFormApp
                                        key={`province-${formKey}`}
                                        control={form.control}
                                        id="province"
                                        name="province"
                                        label="Province"
                                        options={provinceOptions}
                                        placeholder="Sélectionnez une province"
                                    />
                                    <SelectFormApp
                                        key={`city-${formKey}`}
                                        control={form.control}
                                        id="city"
                                        name="city"
                                        label="Ville"
                                        options={cityOptions}
                                        placeholder="Sélectionnez une ville"
                                        disabled={!selectedProvince}
                                    />
                                    <SelectFormApp
                                        key={`street-${formKey}`}
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
                                <h2 className='text-lg font-semibold text-[#146B67] dark:text-[#1FA89B]'>
                                    Statut
                                </h2>
                                <MultiSelectFormApp
                                    control={form.control}
                                    name="status"
                                    options={statusOptions}
                                    placeholder="Sélectionnez le statut"
                                    className='rounded-full p-2 h-14 bg-gray-50 dark:bg-gray-900 dark:text-white'
                                />
                            </section>

                            <section className='space-y-5 p-5'>
                                <h2 className='text-lg font-semibold text-[#146B67] dark:text-[#1FA89B]'>
                                    Prix (FCFA)
                                </h2>
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
                            </section>

                            <section className='space-y-5 p-5'>
                                <h2 className='text-lg font-semibold text-[#146B67] dark:text-[#1FA89B]'>
                                    Surface (m²)
                                </h2>
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
                            </section>

                            <section className='space-y-5 p-5'>
                                <h2 className='text-lg font-semibold text-[#146B67] dark:text-[#1FA89B]'>
                                    Types d'annonces
                                </h2>
                                <MultiSelectFormApp
                                    control={form.control}
                                    name="typeProperty"
                                    options={Object.values(TypeProperty)
                                        .map(type => ({
                                            label: type,
                                            value: getTypePropertyKey(type)!
                                        }))
                                        .sort((a, b) => a.label.localeCompare(b.label))
                                    }
                                    placeholder="Types d'annonces"
                                    className='rounded-full p-2 h-14 bg-gray-50 dark:bg-gray-900 dark:text-white'
                                />
                            </section>

                            <section className='space-y-5 p-5'>
                                <h2 className='text-lg font-semibold text-[#146B67] dark:text-[#1FA89B]'>
                                    Tags
                                </h2>
                                <MultiSelectFormApp
                                    control={form.control}
                                    name="tags"
                                    options={tagsList
                                        .map(tag => ({
                                            label: tag.tagName,
                                            value: tag.tagName
                                        }))
                                        .sort((a, b) => a.label.localeCompare(b.label))
                                    }
                                    placeholder="Sélectionnez les tags"
                                    className='rounded-full p-2 h-14 bg-gray-50 dark:bg-gray-900 dark:text-white'
                                />
                            </section>
                        </div>

                        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-5 border-t border-gray-200 dark:border-gray-700 space-y-3">
                            <Button
                                variant="outline"
                                type="reset"
                                onClick={onClear}
                                className="w-full border-[#146B67] dark:border-[#1FA89B] text-[#146B67] dark:text-[#1FA89B] hover:bg-[#1FA89B]/10 dark:hover:bg-[#1FA89B]/20 rounded-full mb-2"
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
                                    {nbHits} {nbHits > 1 ? 'annonces trouvées' : 'annonce trouvée'}
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                                {items.map((propertyData, i) => (
                                    <div 
                                        key={propertyData.objectID}
                                        className="transform transition-all duration-300 hover:translate-y-[-4px]"
                                    >
                                        <PropertyCard 
                                            property={propertyData} 
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
                                <span>Voir plus d'annonces</span>
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
