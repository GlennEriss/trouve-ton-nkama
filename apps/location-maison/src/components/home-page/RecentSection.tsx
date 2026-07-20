'use client'
import React from 'react'
import PropertyCarousel from '../property/PropertyCarousel'
import Image from 'next/image'
import queryKeys from '@/constantes/react-query-keys'
import { PROPERTY_ITEM_PER_PAGE_CAROUSEL } from '@/constantes/item-per-page'
import { useInfiniteQuery } from '@tanstack/react-query'

export default function RecentSection() {
    const fetchInfiniteProperties = async ({ pageParam }: { pageParam: any }) => {
        const { limitPerPage, lastDoc } = pageParam;
        const params = new URLSearchParams({ limitPerPage: String(limitPerPage) });
        if (lastDoc) params.set('lastDoc', String(lastDoc));
        const url = `/api/property/list?${params.toString()}`;
        const response = await fetch(url, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
            },
        });
        if (!response.ok) {
            throw new Error("Failed to fetch properties");
        }
        const data = await response.json();
        return data;
    };
    const { data } = useInfiniteQuery({
        queryKey: [queryKeys.propertie_carousel],
        queryFn: fetchInfiniteProperties,
        initialPageParam: { limitPerPage: PROPERTY_ITEM_PER_PAGE_CAROUSEL, lastDoc: null },
        getNextPageParam: (lastPage, allPages, pageParam) => {
            const { limitPerPage } = pageParam;
            const lastDoc = allPages[allPages.length - 1]?.lastDoc ?? null;
            return lastDoc ? { limitPerPage, lastDoc } : undefined;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
        gcTime: 1000 * 60 * 15, // 15 minutes
        refetchOnWindowFocus: false,
    })
    return (
        <section className='relative space-y-3 bg-gradient-to-r from-[#146B67]/5 via-[#1FA89B]/10 to-[#146B67]/5 rounded-3xl p-5 py-10 overflow-hidden'>
            {/* Forme 3 - Derrière la 5ème section */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 overflow-hidden">
                <Image
                    src="/assets/home-page/form.webp"
                    alt="Background shape"
                    fill
                    className="object-cover opacity-10 -rotate-90"
                />
            </div>
            <h1 className='text-xl lg:text-2xl xl:text-3xl leading-tight font-bold text-center text-[#146B67]'>
                Annonces récentes
            </h1>
            <PropertyCarousel properties={data?.pages[0]?.properties ?? []} />
        </section>
    )
}
