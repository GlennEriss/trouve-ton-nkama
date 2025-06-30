'use client'
import React from 'react'
import { propertyTypesList } from './PropertyTypeList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { TypeProperty } from '@/constantes/property-type'
import { useServerCountByPropertyType } from '@/hooks/use-server-count-property-by-type'
import { useAlgoliaContext } from '@/providers/AlgoliaContext'
import { useRouter } from 'next/navigation'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

export default function CarouselPropertyType() {
    const { setTypeProperty } = useAlgoliaContext()
    const router = useRouter()

    // Appeler les hooks individuellement au niveau du composant (conforme aux règles React)
    const homeCount = useServerCountByPropertyType("Home")
    const studioCount = useServerCountByPropertyType("Studio")
    const apartmentCount = useServerCountByPropertyType("Apartment")
    const buildingCount = useServerCountByPropertyType("Building")
    const deskCount = useServerCountByPropertyType("Desk")
    const roomCount = useServerCountByPropertyType("Room")
    const kioskCount = useServerCountByPropertyType("Kiosk")
    const shopCount = useServerCountByPropertyType("Shop")
    const landCount = useServerCountByPropertyType("Land")

    // Créer le mapping des données
    const propertyCounts: Record<string, number> = {
        "Home": homeCount.data ?? 0,
        "Studio": studioCount.data ?? 0,
        "Apartment": apartmentCount.data ?? 0,
        "Building": buildingCount.data ?? 0,
        "Desk": deskCount.data ?? 0,
        "Room": roomCount.data ?? 0,
        "Kiosk": kioskCount.data ?? 0,
        "Shop": shopCount.data ?? 0,
        "Land": landCount.data ?? 0,
    }

    const handleClick = (propertyType: string) => {
        setTypeProperty([propertyType])
        const params = new URLSearchParams()
        params.append("typeProperty", propertyType)
        router.push(`/search?${params.toString()}`)
    }

    const settings = {
        dots: true,
        arrows: false,
        infinite: true,
        speed: 500,
        slidesToShow: 4,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 5000,
        pauseOnHover: true,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 1,
                },
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                },
            },
            {
                breakpoint: 480,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                },
            },
        ],
    }

    return (
        <div className="px-4 md:px-8">
            <Slider {...settings} className="my-8">
                {propertyTypesList.map((property) => {
                    const count = propertyCounts[property.type]

                    return (
                        <div key={property.type} className="px-2">
                            <Card
                                className="group flex flex-col items-center cursor-pointer bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-lg"
                                onClick={() => handleClick(property.type)}
                            >
                                <CardHeader className="flex flex-col items-center pt-6">
                                    <div className="relative">
                                        <CardTitle className="rounded-full w-20 h-20 flex items-center justify-center bg-gradient-to-br from-[#146B67]/10 to-[#1FA89B]/10 group-hover:from-[#146B67]/20 group-hover:to-[#1FA89B]/20 transition-colors duration-300">
                                            <div className="text-[#146B67] text-3xl group-hover:scale-110 transition-transform duration-300">
                                                {property.icon}
                                            </div>
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-center pb-6">
                                    <h1 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 group-hover:text-[#146B67] transition-colors duration-300">
                                        {TypeProperty[property.type]}
                                    </h1>
                                    <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                                        {count} Propriété{count > 1 ? 's' : ''}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        </div>
                    )
                })}
            </Slider>
        </div>
    )
}
