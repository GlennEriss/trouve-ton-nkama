'use client'
import React from 'react'
import { propertyTypesList } from './PropertyTypeList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { TypeProperty } from '@/constantes/property-type'
import { useServerPropertyCountSummary } from '@/hooks/use-server-property-count-summary'
import { useAlgoliaContext } from '@/providers/AlgoliaContext'
import { useRouter } from 'next/navigation'
import Slider from 'react-slick'
import { motion, useReducedMotion } from 'framer-motion'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import { HomePropertyTypeKey } from '@/constantes/home-page'

export default function CarouselPropertyType() {
    const { setTypeProperty } = useAlgoliaContext()
    const router = useRouter()
    const {
        data: summary,
        isLoading,
        isError,
    } = useServerPropertyCountSummary()
    const shouldReduceMotion = useReducedMotion()

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
                {propertyTypesList.map((property, index) => {
                    const typeKey = property.type as HomePropertyTypeKey
                    const count = summary?.byType?.[typeKey]

                    const countLabel = isLoading
                        ? 'Chargement...'
                        : isError
                            ? 'Indisponible'
                            : typeof count === 'number'
                                ? `${count} Annonce${count > 1 ? 's' : ''}`
                                : '—'

                    return (
                        <motion.div
                            key={property.type}
                            className="px-2"
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                            whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.35, delay: index * 0.04 }}
                        >
                            <Card
                                className="group flex flex-col items-center cursor-pointer bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-lg"
                                onClick={() => handleClick(property.type)}
                            >
                                <CardHeader className="flex flex-col items-center pt-6">
                                    <div className="relative">
                                        <CardTitle className="rounded-full w-20 h-20 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors duration-300">
                                            <div className="text-primary text-3xl group-hover:scale-110 transition-transform duration-300">
                                                {property.icon}
                                            </div>
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-center pb-6">
                                    <h1 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 group-hover:text-primary transition-colors duration-300">
                                        {TypeProperty[property.type]}
                                    </h1>
                                    <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                                        {isLoading ? (
                                            <span className="inline-flex items-center gap-2">
                                                <span className="h-2 w-14 rounded-full bg-gray-300/80 animate-pulse" />
                                                <span>Chargement...</span>
                                            </span>
                                        ) : (
                                            countLabel
                                        )}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )
                })}
            </Slider>
        </div>
    )
}
