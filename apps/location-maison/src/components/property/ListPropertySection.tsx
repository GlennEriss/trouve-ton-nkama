'use client'
import React from 'react'
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
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getCountStatisticsByPropertyType, getProperties } from '@/db/property.db';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PROPERTY_ITEM_PER_PAGE } from '@/constantes/item-per-page';
import queryKeys from '@/constantes/react-query-keys';
import { RemoveProperty } from './RemoveProperty';
import { Skeleton } from '../ui/skeleton';

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
            <div className="px-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, index) => (
                    <SkeletonCard key={index} />
                ))}
            </div>
        );
    }
    if (!data || data.pages[currentPage]?.properties?.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 gap-3">
                <Image src="/no-favorites.svg" width={250} height={250} alt="Aucun favori" />
                <h2 className="text-xl font-semibold text-gray-700">Aucune propriété pour le moment</h2>
                <p className="text-gray-500 text-center">Ajoutez des propriétés pour enrichir votre catalogue</p>
            </div>
        );
    }
    return (
        <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-center">
                {data?.pages[currentPage].properties.map((item, key) => (
                    <CardPropertyCrud key={key} property={item} />
                ))}
            </div>
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
        </div>

    )
}

const STATUS_COLORS: Record<Property['status'], { bg: string; text: string }> = {
    FOR_RENT: { bg: 'bg-blue-100', text: 'text-blue-700' },
    FOR_SALE: { bg: 'bg-green-100', text: 'text-green-700' },
};

export const CardPropertyCrud = ({ property }: { property: Property }) => {
    const { images, title, street, city, province, price, status } = property;
    const statusColors = STATUS_COLORS[status];

    return (
        <Card
            className={cn(
                'relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1',
                'flex flex-col bg-white dark:bg-gray-900 dark:border-gray-800',
                'w-[330px] lg:w-[300px] h-[400px]'
            )}
        >
            {/* Image */}
            <div className="relative h-40 w-full rounded-t-xl overflow-hidden border-b">
                <Image
                    src={images[0]?.fileURL || '/fallback-image.jpg'}
                    alt={title}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-t-xl transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                {/* Badge pour le statut */}
                <span
                    className={cn(
                        'absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold uppercase',
                        'bg-opacity-75 backdrop-blur-md',
                        statusColors.bg,
                        statusColors.text
                    )}
                >
                    {status === 'FOR_RENT' ? 'À Louer' : 'À Vendre'}
                </span>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 flex flex-col justify-between p-4 gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{street}, {city}, {province}</p>
                    <hr className="my-2 border-gray-200 dark:border-gray-700" />
                    <PropertyInformations property={property} />
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-3">
                    <span className="font-semibold text-lg text-gray-800 dark:text-gray-200">{price} FCFA</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="hover:bg-gray-200 dark:hover:bg-gray-700" asChild>
                            <Link href={routes.protected.properties + '/modify/' + property.id}>
                                <FiEdit2 size={18} />
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:bg-gray-200 dark:hover:bg-gray-700" asChild>
                            <Link href={`${routes.protected.properties}/${property.id}`}>
                                <AiOutlineEye size={18} />
                            </Link>
                        </Button>
                        <RemoveProperty id={property.id!} />
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
            default:
                return <DetailsVilla villa={property as Villa} />
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
    pool: {
        label: 'Piscines',
        icon: FaSwimmingPool
    }
}
const DetailsItem = ({ keyName, value }: { keyName: string, value: number }) => {
    const item = items[keyName]
    return (
        <div className="flex gap-1 items-center">
            <item.icon size={20} />
            <span className='text-sm'>{value}</span>
            <span className='text-sm'>{item.label}</span>
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
        <div className='grid grid-cols-2 gap-2'>
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
        <div className='grid grid-cols-2 gap-2'>
            <DetailsItem keyName='floor' value={building.nbrFloors} />
            <DetailsItem keyName='apartment' value={building.nbrApartments} />
        </div>
    )
}

const DetailsDesk = ({ desk }: { desk: Desk }) => {
    return (
        <div className="grid grid-cols-2 gap-2">
            <DetailsItem keyName='toilet' value={desk.nbrToilets} />
            <DetailsItem keyName='room' value={desk.nbrRooms} />
        </div>
    )
}

const DetailsHome = ({ home }: { home: Home }) => {
    return (
        <div className='flex flex-col gap-2'>
            <DetailsLogement logement={home} />
            <div className="grid grid-cols-2 gap-2 ">
                <DetailsItem keyName='floor' value={home.nbrFloors} />
                <DetailsItem keyName='garage' value={home.nbrGarages} />
            </div>
        </div>

    )
}

const DetailsShop = ({ shop }: { shop: Shop }) => {
    return (
        <div>
            <span className='text-sm'>Type de boutique: {shop.shopType}</span>
        </div>
    )
}

const DetailsKiosk = ({ kiosk }: { kiosk: Kiosk }) => {
    return (
        <div>
            <span className='text-sm'>Taille du kiosque: {kiosk.kioskSize} m²</span>
        </div>
    )
}

const DetailsRoom = ({ room }: { room: Room }) => {
    return (
        <div>
            <span className='text-sm'>Type de chambre: {room.roomType}</span>
            <span className='text-sm'>Nombre de lits: {room.nbrBeds}</span>
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
        <div className='flex flex-col gap-2'>
            <DetailsLogement logement={villa} />
            <div>
                <DetailsItem keyName='floor' value={villa.nbrFloors} />
                <DetailsItem keyName='pool' value={villa.nbrPiscine} />
                <DetailsItem keyName='garage' value={villa.nbrGarages} />
            </div>
        </div>
    )
}


const SkeletonCard = () => (
    <div className="p-2 rounded-lg bg-gray-100 shadow-xl">
        <Skeleton className="h-52 w-full rounded-lg" />
        <div className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-1" />
            <Skeleton className="h-4 w-1/3 mb-3" />
            <Skeleton className="h-5 w-1/2" />
        </div>
    </div>
);