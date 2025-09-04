import React from 'react'
import { Form } from '../ui/form'
import { FormFilterSchemaType } from '@/models/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormFilterSchema } from '@/models/schema';
import MapViewerModal from './MapViewerModal';
import { SelectFilterLocationMediatorFactory } from '@/factories/mediator/SelectFilterLocationMediatorFactory';
import SelectProvince from './SelectProvince';
import SelectCity from './SelectCity';
import SelectStreet from './SelectStreet';
import MultiSelectFormApp from '../shared/form/MultiSelectFormApp'
import { tags as tagsList, statusOptions } from "@/constantes";
import InputFormNumberApp from '../shared/form/InputFormNumberApp'
import { TypeProperty, getTypePropertyKey } from '@/constantes/property-type'
import { Button } from '../ui/button'
import { useAlgoliaContext } from '@/providers/AlgoliaContext';
import { useRouter } from 'next/navigation'

export default function FilterSearchDesktopPageSection() {
    const router = useRouter();
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
    SelectFilterLocationMediatorFactory.create(form);
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
        router.replace('/search');
    };

    return (
        <div className="w-1/4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="h-[calc(100vh-40px)] flex flex-col">
                    <div className='border-b border-gray-200 dark:border-gray-700 p-5'>
                        <div className='flex items-center justify-center mb-3'>
                            <h1 className='text-2xl font-bold text-[#146B67] dark:text-[#1FA89B] text-center'>
                                Filtres de recherches
                            </h1>
                        </div>
                        <MapViewerModal />
                    </div>
                    <div className="flex-1 overflow-auto mb-20">
                        <section>
                            <div className='space-y-5 p-5'>
                                <h2 className='text-lg font-semibold text-[#146B67] dark:text-[#1FA89B]'>
                                    Secteur recherché
                                </h2>
                                <SelectProvince />
                                <SelectCity />
                                <SelectStreet />
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
    )
}
