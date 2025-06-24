'use client'
import React, { useState } from 'react'
import { Card } from '../ui/card'
import Image from 'next/image'
import { IconType } from 'react-icons/lib';
import { BsBuilding } from 'react-icons/bs'
import { FaBath, FaToilet, FaRegBuilding, FaSwimmingPool, FaTrash } from 'react-icons/fa'
import { IoMdBed } from 'react-icons/io'
import { MdKitchen } from 'react-icons/md'
import { RiBookmarkLine } from 'react-icons/ri'
import { GiHomeGarage } from 'react-icons/gi'
import { Button } from '../ui/button'
import Link from 'next/link'
import { FiEdit2 } from 'react-icons/fi'
import { AiOutlineEye } from 'react-icons/ai'
import { useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { routes } from '@/constantes/routes';
import { Property, Apartment, Building, Desk, Home, Studio, Villa, Logement, Shop, Kiosk, Room, TypeProperty } from '@/models/annonce';
import { cn } from '@/lib/utils';
import { capitalizeFirstLetter } from '@/lib/capitalizeFirstLetter';
import { ChevronLeft, ChevronRight, MapPin, Calendar, Eye, Edit3, MoreVertical } from 'lucide-react'
import { getCountStatisticsByPropertyType, getProperties, updateProperty } from '@/db/property.db';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PROPERTY_ITEM_PER_PAGE } from '@/constantes/item-per-page';
import queryKeys from '@/constantes/react-query-keys';
import { RemoveProperty } from './RemoveProperty';
import { Skeleton } from '../ui/skeleton';
import { Switch } from '../ui/switch';
import { useQueryClient } from '@tanstack/react-query';
import PromotionButton from '../promotion/PromotionButton';
import PromotionBadge from '../promotion/PromotionBadge';

export default function ListPropertySection() {
    const searchParams = useSearchParams();
    const queryType = searchParams.get("type") || "";
    const type = capitalizeFirstLetter(queryType);
    const { user } = useCurrentUser();
    const [currentPage, setCurrentPage] = React.useState(0);
    const [totalPage, setTotalPage] = React.useState(0);
    const fetchInfiniteProperties = async ({ pageParam }: { pageParam: any }) => {
        const { limitPerPage, lastDoc } = pageParam;
        const createdBy = user ? user.uid : '';
        return getProperties({
            limitPerPage,
            lastDoc,
            createdBy,
            type
        })
    }
    const { data, isPending, isFetching, fetchNextPage, error, isError } = useInfiniteQuery({
        queryKey: [queryKeys.properties, type, user],
        queryFn: fetchInfiniteProperties,
        initialPageParam: { limitPerPage: PROPERTY_ITEM_PER_PAGE, lastDoc: null },
        getNextPageParam: (lastPage, allPages, pageParam) => {
            const { limitPerPage } = pageParam;
            const lastDoc = allPages[allPages.length - 1].lastDoc;
            return { limitPerPage, lastDoc };
        },
    })
    const handlePrev = () => {
        setCurrentPage(currentPage - 1);
    };
    const handleNext = () => {
        if (data?.pages.length! - 1 === currentPage) {
            fetchNextPage();
        }
        setCurrentPage(currentPage + 1);
    };
    React.useEffect(() => {
        getCountStatisticsByPropertyType(user?.uid ?? '', type as TypeProperty)
            .then((count) => {
                const total = Math.ceil(count / PROPERTY_ITEM_PER_PAGE)
                setTotalPage(total)
            })
    }, [user, type])
    if (isError) {
        console.log(error)
    }
    if (isPending || isFetching) {
        return (
            <div className="px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <SkeletonCard key={index} />
                    ))}
                </div>
            </div>
        );
    }
    if (!data || data.pages[currentPage]?.properties?.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="relative mb-8">
                    <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                        <Image src="/no-favorites.svg" width={80} height={80} alt="Aucun favori" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full opacity-60"></div>
                    <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gray-400 dark:bg-gray-500 rounded-full opacity-40"></div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3 text-center">
                    Aucune propriété trouvée
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md leading-relaxed">
                    Il n'y a actuellement aucune propriété qui correspond à vos critères. 
                    Ajoutez des propriétés pour enrichir votre catalogue.
                </p>
            </div>
        );
    }
    return (
        <div className="px-4 py-6">
            {/* Grid des propriétés */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6 mb-8">
                {data?.pages[currentPage].properties.map((item, key) => (
                    <CardPropertyCrud key={key} property={item} />
                ))}
            </div>

            {/* Pagination améliorée */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page <span className="font-semibold text-gray-900 dark:text-white">{currentPage + 1}</span> sur <span className="font-semibold">{totalPage}</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                        disabled={isPending || isFetching || currentPage === 0}
                        className="flex items-center gap-2 px-4"
                    >
                        <ChevronLeft size={16} />
                        <span className="hidden sm:inline">Précédent</span>
                    </Button>
                    
                    <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: Math.min(totalPage, 5) }, (_, i) => {
                            let pageIndex;
                            if (totalPage <= 5) {
                                pageIndex = i;
                            } else if (currentPage < 3) {
                                pageIndex = i;
                            } else if (currentPage >= totalPage - 2) {
                                pageIndex = totalPage - 5 + i;
                            } else {
                                pageIndex = currentPage - 2 + i;
                            }
                            
                            return (
                                <button
                                    key={pageIndex}
                                    onClick={() => setCurrentPage(pageIndex)}
                                    className={cn(
                                        "w-8 h-8 rounded-md text-sm font-medium transition-all duration-200",
                                        pageIndex === currentPage
                                            ? "bg-[#146B67] text-white shadow-md"
                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    )}
                                >
                                    {pageIndex + 1}
                                </button>
                            );
                        })}
                    </div>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        className="flex items-center gap-2 px-4"
                        disabled={isPending || !(currentPage < (totalPage - 1))}
                    >
                        <span className="hidden sm:inline">Suivant</span>
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
        </div>
    )
}

const STATUS_COLORS: Record<Property['status'], { bg: string; text: string; border: string }> = {
    FOR_RENT: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
    FOR_SALE: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700' },
};

export const CardPropertyCrud = ({ property }: { property: Property }) => {
    const { images, title, street, city, province, price, status } = property;
    const statusColors = STATUS_COLORS[status];
    const [loading, setIsLoading] = useState(false)
    const { user } = useCurrentUser();
    const queryClient = useQueryClient();
    const [localState, setLocalState] = useState(property.state);
    
    // Fonction pour mettre à jour une propriété dans les pages
    const updatePropertyInPage = (page: any, newState: string) => ({
        ...page,
        properties: page.properties.map((p: any) =>
            p.id === property.id ? { ...p, state: newState } : p
        ),
    });

    // Fonction pour mettre à jour toutes les pages
    const updateAllPages = (oldData: any, newState: string) => {
        if (!oldData) return oldData;
        
        return {
            ...oldData,
            pages: oldData.pages.map((page: any) => updatePropertyInPage(page, newState)),
        };
    };

    const handleChangePropertyState = async () => {
        setIsLoading(true);
        const newState = localState === 'ARCHIVED' ? 'IN_PROGRESS' : 'ARCHIVED';

        await updateProperty(property.id!, {
            ...property,
            state: newState,
        });

        queryClient.setQueryData([queryKeys.properties, property.typeProperty, user], (oldData: any) => 
            updateAllPages(oldData, newState)
        );
        
        setLocalState(newState);
        setIsLoading(false);
    }
    
    return (
        <Card className="group relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            {/* Section Image - Hauteur fixe uniforme */}
            <div className="relative w-full h-48 overflow-hidden rounded-t-2xl bg-gray-100 dark:bg-gray-800">
                <Image
                    src={images[0]?.fileURL || '/fallback-image.jpg'}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Badges statut et promotion */}
                <div className="absolute top-3 left-3 space-y-2">
                    <div className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border",
                        statusColors.bg,
                        statusColors.text,
                        statusColors.border
                    )}>
                        {status === 'FOR_RENT' ? 'À Louer' : 'À Vendre'}
                    </div>
                    <PromotionBadge property={property} />
                </div>
                
                {/* Actions rapides - Visibles au hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="w-8 h-8 p-0 backdrop-blur-md bg-white/20 hover:bg-white/30 border-white/20"
                            asChild
                        >
                            <Link href={`${routes.protected.properties}/${property.id}`}>
                                <Eye size={14} className="text-white" />
                            </Link>
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="w-8 h-8 p-0 backdrop-blur-md bg-white/20 hover:bg-white/30 border-white/20"
                            asChild
                        >
                            <Link href={routes.protected.properties + '/modify/' + property.id}>
                                <Edit3 size={14} className="text-white" />
                            </Link>
                        </Button>
                    </div>
                </div>
                
                {/* Indicateur d'état */}
                <div className={cn(
                    "absolute top-3 right-3 w-3 h-3 rounded-full border-2 border-white shadow-sm",
                    localState === 'IN_PROGRESS' ? 'bg-green-500' : 'bg-red-500'
                )} />
            </div>

            {/* Contenu principal */}
            <div className="p-5 space-y-4">
                {/* Header */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-1">
                        {title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="line-clamp-1">{street}, {city}, {province}</span>
                    </div>
                </div>

                {/* Informations de la propriété */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                    <PropertyInformations property={property} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {new Intl.NumberFormat('fr-FR').format(Number(price))} <span className="text-sm font-normal text-gray-500">FCFA</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Switch
                                disabled={loading}
                                checked={localState === "IN_PROGRESS"}
                                onCheckedChange={handleChangePropertyState}
                                className="scale-75"
                            />
                            <span className={cn(
                                "font-medium",
                                localState === 'IN_PROGRESS' 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                            )}>
                                {localState === 'IN_PROGRESS' ? 'Disponible' : 'Indisponible'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Section des actions - Réorganisée */}
                    <div className="flex flex-col gap-2">
                        {/* Ligne 1: Bouton de promotion (plus large) */}
                        <div className="flex justify-end">
                            <PromotionButton property={property} />
                        </div>
                        
                        {/* Ligne 2: Boutons d'action principaux */}
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                asChild
                            >
                                <Link href={`${routes.protected.properties}/${property.id}`}>
                                    <AiOutlineEye size={16} />
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                asChild
                            >
                                <Link href={routes.protected.properties + '/modify/' + property.id}>
                                    <FiEdit2 size={16} />
                                </Link>
                            </Button>
                            <RemoveProperty id={property.id!} />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export const PropertyInformations = ({ property }: { property: Property }) => {
    const informations = () => {
        switch (property.typeProperty) {
            case 'Apartment':
                return <DetailsApartment apartment={property as Apartment} />
            case 'Building':
                return <DetailsBuilding building={property as Building} />
            case 'Desk':
                return <DetailsDesk desk={property as Desk} />
            case 'Home':
                return <DetailsHome home={property as Home} />
            case 'Studio':
                return <DetailsStudio studio={property as Studio} />
            case 'Shop':
                return <DetailsShop shop={property as Shop} />
            case 'Kiosk':
                return <DetailsKiosk kiosk={property as Kiosk} />
            case 'Room':
                return <DetailsRoom room={property as Room} />
            case "Villa":
                return <DetailsVilla villa={property as Villa} />
            default:
                return <DetailsLand land={property} />
        }
    }
    return (
        <div>
            {informations()}
        </div>
    )
}

const items: Record<string, { label: string, icon: IconType }> = {
    room: {
        label: 'Salles',
        icon: RiBookmarkLine
    },
    bedroom: {
        label: 'Chambres',
        icon: IoMdBed
    },
    kitchen: {
        label: 'Cuisines',
        icon: MdKitchen
    },
    bathroom: {
        label: 'Douches',
        icon: FaBath
    },
    toilet: {
        label: 'Toilettes',
        icon: FaToilet
    },
    floor: {
        label: 'Etages',
        icon: FaRegBuilding
    },
    apartment: {
        label: 'Appartements',
        icon: BsBuilding
    },
    garage: {
        label: 'Garages',
        icon: GiHomeGarage
    },
    parking: {
        label: 'Parking',
        icon: GiHomeGarage
    },
    pool: {
        label: 'Piscines',
        icon: FaSwimmingPool
    }
}

const DetailsItem = ({ keyName, value }: { keyName: string, value: any }) => {
    const item = items[keyName]
    return keyName === 'parking' ? (
        <React.Fragment>
            {
                value && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <item.icon size={14} />
                        </div>
                        <span className="font-medium">{item.label}</span>
                    </div>
                )
            }
        </React.Fragment>
    ) : (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <item.icon size={14} />
            </div>
            <span className="font-medium">{value}</span>
            <span>{item.label}</span>
        </div>
    )
}

const logementItems = ['bedroom', 'kitchen', 'bathroom', 'toilet']

const DetailsLogement = ({ logement }: { logement: Logement }) => {
    const getDetailComponent = (keyName: string) => {
        switch (keyName) {
            case 'bedroom':
                return <DetailsItem keyName={keyName} value={logement.nbrRooms} />
            case 'kitchen':
                return <DetailsItem keyName={keyName} value={logement.nbrChickens} />
            case 'bathroom':
                return <DetailsItem keyName={keyName} value={logement.nbrBathrooms} />
            default:
                return <DetailsItem keyName={keyName} value={logement.nbrToilets} />
        }
    }
    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {
                logementItems.map((keyName, index) => (
                    <React.Fragment key={index}>
                        {getDetailComponent(keyName)}
                    </React.Fragment>
                ))
            }
        </div>
    )
}

const DetailsApartment = ({ apartment }: { apartment: Apartment }) => {
    return (
        <div>
            <DetailsLogement logement={apartment} />
        </div>
    )
}

const DetailsBuilding = ({ building }: { building: Building }) => {
    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <DetailsItem keyName='floor' value={building.nbrFloors} />
            <DetailsItem keyName='apartment' value={building.nbrApartments} />
            <DetailsItem keyName='parking' value={building.hasParking} />
        </div>
    )
}

const DetailsDesk = ({ desk }: { desk: Desk }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailsItem keyName='toilet' value={desk.nbrToilets} />
            <DetailsItem keyName='room' value={desk.nbrRooms} />
        </div>
    )
}

const DetailsHome = ({ home }: { home: Home }) => {
    return (
        <div className='space-y-3'>
            <DetailsLogement logement={home} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailsItem keyName='floor' value={home.nbrFloors} />
                <DetailsItem keyName='garage' value={home.nbrGarages} />
            </div>
        </div>
    )
}

const DetailsShop = ({ shop }: { shop: Shop }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailsItem keyName='room' value={shop.nbrRooms} />
        <DetailsItem keyName='toilet' value={shop.nbrToilet} />
    </div>
);

const DetailsKiosk = ({ kiosk }: { kiosk: Kiosk }) => (
    <div className="text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <BsBuilding size={14} />
            </div>
            <span className="font-medium">Type de Kiosque: {kiosk.kioskType}</span>
        </div>
    </div>
);

const DetailsRoom = ({ room }: { room: Room }) => {
    return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <IoMdBed size={14} />
                </div>
                <span className="font-medium">Type de chambre: {room.roomType}</span>
            </div>
        </div>
    )
}

export const DetailsStudio = ({ studio }: { studio: Studio }) => {
    return (
        <div>
            <DetailsLogement logement={studio} />
        </div>
    )
}

export const DetailsVilla = ({ villa }: { villa: Villa }) => {
    return (
        <div className='space-y-3'>
            <DetailsLogement logement={villa} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailsItem keyName='floor' value={villa.nbrFloors} />
                <DetailsItem keyName='pool' value={villa.nbrPiscine} />
                <DetailsItem keyName='garage' value={villa.nbrGarages} />
            </div>
        </div>
    )
}

export const DetailsLand = ({ land }: { land: Property }) => {
    return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <MapPin size={14} />
                </div>
                <span className="font-medium">Superficie: {land.area} m²</span>
            </div>
        </div>
    )
}

const SkeletonCard = () => (
    <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
        <Skeleton className="h-48 w-full" />
        <div className="p-5 space-y-4">
            <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
            <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-8 w-1/3" />
                <div className="flex gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                </div>
            </div>
        </div>
    </Card>
);