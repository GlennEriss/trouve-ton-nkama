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
import { Property, Apartment, Building, Desk, Home, Studio, Villa, Logement, TypeProperty } from '@/models/annonce';
import { cn } from '@/lib/utils';
import { capitalizeFirstLetter } from '@/lib/capitalizeFirstLetter';
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getCountStatisticsByPropertyType, getProperties } from '@/db/property.db';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PROPERTY_ITEM_PER_PAGE } from '@/constantes/item-per-page';
import queryKeys from '@/constantes/react-query-keys';
import { RemoveProperty } from './RemoveProperty';

export default function ListPropertySection() {
    const searchParams = useSearchParams();
    const queryType = searchParams.get("type") || "";
    const type = capitalizeFirstLetter(queryType);
    const user = useCurrentUser();
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
    const { data, isPending, isFetching, fetchNextPage } = useInfiniteQuery({
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
    if (isPending || isFetching) {
        return <div>Loading...</div>
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
                'relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300',
                'flex flex-col'
            )}
        >
            {/* Image */}
            <div className="relative h-48 w-full">
                <Image
                    src={images[0]?.fileURL || '/fallback-image.jpg'} // Fallback si aucune image
                    alt={title}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-t-lg"
                />
                {/* Badge pour le statut */}
                <span
                    className={cn(
                        'absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-semibold',
                        statusColors.bg,
                        statusColors.text
                    )}
                >
                    {status === 'FOR_RENT' ? 'À Louer' : 'À Vendre'}
                </span>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 flex flex-col justify-between p-4 gap-2">
                <div>
                    <h3 className="text-lg font-bold line-clamp-1">{title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                        {street}, {city}, {province}
                    </p>
                    <PropertyInformations property={property} />
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-2">
                    <span className="font-semibold text-lg text-gray-800">{price} FCFA</span>

                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" asChild>
                            <Link href={routes.protected.properties + '/modify/' + property.id}>
                                <FiEdit2 size={18} />
                            </Link>
                        </Button>
                        <Button variant="outline" size="icon" asChild>
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