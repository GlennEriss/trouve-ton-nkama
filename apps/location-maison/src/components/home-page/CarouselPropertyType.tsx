'use client'
import React from 'react'
import { propertyTypesList } from './PropertyTypeList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { TypeProperty } from '@/lib/utils'
import { useServerCountByPropertyType } from '@/hooks/use-server-count-property-by-type'
import { useAlgoliaContext } from '@/providers/AlgoliaContext'
import { useRouter } from 'next/navigation'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

export default function CarouselPropertyType() {
    const { setTypeProperty } = useAlgoliaContext()
    const router = useRouter()

    const handleClick = (propertyType: string) => {
        setTypeProperty([propertyType])
        const params = new URLSearchParams()
        params.append("typeProperty", propertyType)
        router.push(`/search?${params.toString()}`)
    }

    // Slider settings
    const settings = {
        dots: true, // Activer les dots
        arrows: false, // Désactiver les flèches
        infinite: true,
        speed: 500,
        slidesToShow: 4,
        slidesToScroll: 1,
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
        <Slider {...settings} className="my-8">
            {propertyTypesList.map((property, key) => {
                const { data: count = 0 } = useServerCountByPropertyType(property.type)

                return (
                    <div key={key} className="px-2">
                        <Card
                            className="flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
                            onClick={() => handleClick(property.type)}
                        >
                            <CardHeader className="flex flex-col items-center">
                                <CardTitle className="rounded-full border w-20 h-20 flex items-center justify-center bg-gray-100">
                                    {property.icon}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <h1 className="text-xl font-bold text-gray-900">{TypeProperty[property.type]}</h1>
                                <CardDescription className="text-gray-600">{count} Propriété(s)</CardDescription>
                            </CardContent>
                        </Card>
                    </div>
                )
            })}
        </Slider>
    )
}
