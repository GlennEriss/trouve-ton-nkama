'use client'
import React from 'react'
import Image from "next/image";
import { IoMdBed } from "react-icons/io";
import { FaToilet } from "react-icons/fa";
import { MdOutlineSquareFoot } from "react-icons/md";
import { TypeProperty } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useInfiniteQuery } from '@tanstack/react-query';
import queryKeys from '@/constantes/react-query-keys';
import { PROPERTY_ITEM_PER_PAGE } from '@/constantes/item-per-page';
import { Property } from '@/models/annonce';
import { getPropertyById } from '@/db/property.db';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function SectionFavoris() {
    const user = useCurrentUser()
    const router = useRouter();
    const [currentPage, setCurrentPage] = React.useState(0);
    const [totalPage, setTotalPage] = React.useState(0);
    const handleCardClick = (id: number | string) => {
        router.push(`/houseDetails/${id}`);
    };
    const handleNext = () => {
        currentPage < totalPage - 1 && setCurrentPage(currentPage + 1);
    }
    const handlePrev = () => {
        currentPage > 0 && setCurrentPage(currentPage - 1);
    }
    const fetchInfiniteProperties = async ({ pageParam }: { pageParam: any }) => {
        const { limitPerPage, lastDoc } = pageParam;
        const paginated: string[][] = [];
        if (user?.favoris) {
            for (let i = 0; i < user.favoris.length; i += limitPerPage) {
                paginated.push(user.favoris.slice(i, i + limitPerPage));
            }
        }
        setTotalPage(paginated.length)
        const properties: Property[] = []
        for (let i = 0; i < paginated[currentPage].length; i++) {
            const property = await getPropertyById(paginated[currentPage][i])
            if (property) {
                properties.push(property)
            }
        }
        const favoris = {
            properties,
            lastDoc: null,
            limitPerPage
        }
        return favoris
    }
    const { data, isPending, isFetching, fetchNextPage, isLoading } = useInfiniteQuery({
        queryKey: [queryKeys.favoris, user, currentPage],
        queryFn: fetchInfiniteProperties,
        initialPageParam: { limitPerPage: PROPERTY_ITEM_PER_PAGE, lastDoc: null },
        getNextPageParam: (lastPage, allPages, pageParam) => {
            const { limitPerPage } = pageParam;
            const lastDoc = allPages[allPages.length - 1].lastDoc;
            return { limitPerPage, lastDoc };
        },
    })
    if (isLoading || isFetching) {
        return (
            <div className="w-10 h-10 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
        )
    }
    if (!data || data.pages[currentPage]?.properties?.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                <Image src="/no-favorites.svg" width={128} height={128} alt="Aucun favori" />
                <h2 className="text-xl font-semibold text-gray-700">Aucun favori pour le moment</h2>
                <p className="text-gray-500">Ajoutez des propriétés à vos favoris pour les retrouver ici</p>
            </div>
        );
    }
    return (
        <div className='px-5'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
                {data?.pages[0].properties.map((property) => (
                    <div key={property.id} className="p-2 rounded-lg">
                        <div
                            onClick={() => handleCardClick(property.id!)}
                            className="relative cursor-pointer rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 bg-white dark:bg-gray-800 hover:shadow-2xl flex flex-col"
                            style={{ height: "380px" }}
                        >
                            {/* Image principale */}
                            <div className="relative w-full h-52 overflow-hidden">
                                <Image
                                    src={property.images?.[0]?.fileURL || "/home.png"}
                                    alt={property.title || "Image de la propriété"}
                                    fill
                                    className="object-cover transform transition-transform duration-500 hover:scale-110"
                                />
                            </div>

                            {/* Contenu de la carte */}
                            <div className="p-4 bg-gradient-to-b from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 flex flex-col justify-between flex-grow">
                                <div>
                                    <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 h-12">
                                        {property.title || "Propriété"}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                        {property.city}, {property.province}, {property.country}
                                    </p>
                                    {property.street && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {property.street}
                                        </p>
                                    )}
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {property.status === "FOR_RENT" ? "À louer" : "À vendre"} -{" "}
                                        {property.price} F CFA
                                    </p>
                                </div>

                                {/* Section d'icônes et chiffres */}
                                {/* <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <div className="flex items-center space-x-1">
                                    <IoMdBed className="w-5 h-5" />
                                    <span className="text-sm">{property.nbrRooms}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <FaToilet className="w-5 h-5" />
                                    <span className="text-sm">{property.nbrToilets}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <MdOutlineSquareFoot className="w-5 h-5" />
                                    <span className="text-sm">{property.area} m²</span>
                                </div>
                            </div> */}
                            </div>

                            {/* Type de propriété */}
                            {property.typeProperty && (
                                <div className="absolute top-2 left-2 px-3 py-1 text-xs font-bold bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200 rounded-full">
                                    {TypeProperty[property.typeProperty]}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {
                totalPage > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={isPending || isFetching || currentPage === 0}
                            className="flex items-center gap-2"
                        >
                            <ChevronLeft size={20} />
                        </Button>
                        <span className="font-medium text-gray-700">
                            Page {currentPage + 1}/ {totalPage}
                        </span>
                        <Button
                            variant="outline"
                            onClick={handleNext}
                            className="flex items-center gap-2"
                            disabled={isPending || !(currentPage < (totalPage - 1))}
                        >
                            <ChevronRight size={20} />
                        </Button>
                    </div>
                )
            }

        </div>

    )
}
