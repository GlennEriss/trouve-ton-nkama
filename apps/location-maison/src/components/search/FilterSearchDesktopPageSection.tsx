'use client'

import React from 'react'
import Link from 'next/link'
import { Form } from '../ui/form'
import { FormFilterSchemaType } from '@/models/schema';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormFilterSchema } from '@/models/schema';
import SelectProvince from './SelectProvince';
import SelectCity from './SelectCity';
import SelectStreet from './SelectStreet';
import MultiSelectFormApp from '../shared/form/MultiSelectFormApp'
import { tags as tagsList, statusOptions } from "@/constantes";
import InputFormNumberApp from '../shared/form/InputFormNumberApp'
import { TypeProperty, getTypePropertyKey } from '@/constantes/property-type'
import { Button } from '../ui/button'
import { useFormFilterSearchMediator } from '@/hooks/useFormFilterSearchMediator'
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import SearchWithAIAccessNoticeDialog from './SearchWithAIAccessNoticeDialog'

export default function FilterSearchDesktopPageSection() {
    const form = useForm<FormFilterSchemaType>({
        resolver: zodResolver(FormFilterSchema)
    });
    const { onSubmit, onClear } = useFormFilterSearchMediator(form);
    const { trackEvent } = useTrackEvent();
    const searchParams = useSearchParams();
    const { status } = useSession();
    const [isAccessDialogOpen, setIsAccessDialogOpen] = React.useState(false);
    const searchWithAIHref = `/search-with-ia?${new URLSearchParams(searchParams.toString()).toString()}&entry=search_cta`;
    const isAuthenticated = status === 'authenticated';

    const onSearchWithAIClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        trackEvent(trackingEvents.CTA_SEARCH_WITH_IA_ENTRY_CLICK, {
            source: 'search_desktop_filters',
            is_authenticated: isAuthenticated ? 1 : 0,
        });

        if (!isAuthenticated) {
            event.preventDefault();
            setIsAccessDialogOpen(true);
        }
    };

    return (
        <div className="w-1/4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
            <FormProvider {...form}>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit((values) => {
                            trackEvent(trackingEvents.CTA_SEARCH_SUBMIT_CLICK, {
                                source: 'search_desktop_filters',
                                has_query: 0,
                                has_filters:
                                    values.province ||
                                    values.city ||
                                    values.street ||
                                    values.minPrice ||
                                    values.maxPrice ||
                                    values.minArea ||
                                    values.maxArea ||
                                    values.minNbrRooms ||
                                    values.maxNbrRooms ||
                                    (values.typeProperty?.length ?? 0) > 0 ||
                                    (values.status?.length ?? 0) > 0 ||
                                    (values.tags?.length ?? 0) > 0
                                        ? 1
                                        : 0,
                            });
                            onSubmit(values);
                        })}
                        className="h-[calc(100vh-40px)] flex flex-col"
                    >
                    <div className='border-b border-gray-200 dark:border-gray-700 p-5'>
                        <div className='flex items-center justify-center mb-3'>
                            <h1 className='text-2xl font-bold text-[#146B67] dark:text-[#1FA89B] text-center'>
                                Filtres de recherches
                            </h1>
                        </div>
                        <div className="flex justify-center">
                            <Link
                                href={searchWithAIHref}
                                className="inline-flex items-center gap-2 rounded-full border border-[#146B67]/30 bg-[#E6F8F5] text-[#146B67] px-4 py-2 text-sm font-medium hover:bg-[#d8f1ed] transition-colors"
                                onClick={onSearchWithAIClick}
                            >
                                Essayer la recherche IA
                            </Link>
                        </div>
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
                            onClick={() => {
                                trackEvent(trackingEvents.CTA_SEARCH_SUBMIT_CLICK, {
                                    source: 'search_desktop_filters_clear',
                                    has_query: 0,
                                });
                                onClear();
                            }}
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
            </FormProvider>
            <SearchWithAIAccessNoticeDialog
                open={isAccessDialogOpen}
                onOpenChange={setIsAccessDialogOpen}
            />
        </div>
    )
}
