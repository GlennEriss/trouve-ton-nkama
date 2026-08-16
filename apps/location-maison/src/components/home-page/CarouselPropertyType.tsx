'use client'
import React from 'react'
import { propertyTypesList } from './PropertyTypeList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@trouve-ton-nkama/ui/card'
import { TypeProperty } from '@/constantes/property-type'
import { useServerPropertyCountSummary } from '@/hooks/use-server-property-count-summary'
import { useAlgoliaContext } from '@/providers/AlgoliaContext'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Slider from 'react-slick'
import { motion, useReducedMotion } from 'framer-motion'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import { HomePropertyTypeKey } from '@/constantes/home-page'
import { Shirt, Footprints, Sparkles, Gem, ShoppingBag as ShoppingBagIcon } from 'lucide-react'

type PublishableLeaf = { id: string; slug: string; name: string; rootId: string; rootName: string }

async function fetchPublishableLeaves(): Promise<PublishableLeaf[]> {
    const response = await fetch('/api/categories/publishable-leaves')
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data.leaves) ? data.leaves : []
}

async function fetchCategoryCount(categoryId: string): Promise<number | null> {
    const response = await fetch(`/api/property/count/by-category?categoryId=${encodeURIComponent(categoryId)}`)
    if (!response.ok) return null
    const data = await response.json()
    return typeof data.count === 'number' ? data.count : null
}

const MODE_LEAF_ICON: Record<string, React.ReactNode> = {
    vetements: <Shirt className="w-10 h-10 text-pink-500" />,
    chaussures: <Footprints className="w-10 h-10 text-amber-500" />,
    'parfums-beaute': <Sparkles className="w-10 h-10 text-purple-500" />,
    accessoires: <Gem className="w-10 h-10 text-teal-500" />,
}

type Tile =
    | { kind: 'type'; key: string; label: string; icon: React.ReactNode }
    | { kind: 'category'; key: string; label: string; icon: React.ReactNode }

/**
 * Tuiles "Types d'annonces" de la home. Historiquement immobilier uniquement
 * (typeProperty) ; étendu le 2026-08-15 (signalé par l'utilisateur, types immobiliers
 * incomplets + catégories Mode absentes) avec les feuilles de catégorie publiables
 * (`GET /api/categories/publishable-leaves`, déjà self-gating : vide tant que Mode n'a
 * pas de catégorie active, donc aucun changement visible avant l'activation de Mode).
 */
export default function CarouselPropertyType() {
    const { setTypeProperty } = useAlgoliaContext()
    const router = useRouter()
    const {
        data: summary,
        isLoading,
        isError,
    } = useServerPropertyCountSummary()
    const { data: leaves = [] } = useQuery({
        queryKey: ['categories', 'publishable-leaves'],
        queryFn: fetchPublishableLeaves,
        staleTime: 1000 * 60 * 10,
    })
    const shouldReduceMotion = useReducedMotion()

    // useQueries (pas useQuery dans un .map) : le nombre de feuilles varie d'un rendu à
    // l'autre (le temps que la requête publishable-leaves résolve), ce que useQuery seul
    // ne supporte pas — appeler un hook un nombre de fois variable violerait les Rules of
    // Hooks.
    const leafCountQueries = useQueries({
        queries: leaves.map((leaf) => ({
            queryKey: ['property-count', 'by-category', leaf.id],
            queryFn: () => fetchCategoryCount(leaf.id),
            staleTime: 1000 * 60 * 5,
        })),
    })

    const handleClick = (tile: Tile) => {
        if (tile.kind === 'type') {
            setTypeProperty([tile.key])
            const params = new URLSearchParams()
            params.append('typeProperty', tile.key)
            router.push(`/search?${params.toString()}`)
            return
        }
        const params = new URLSearchParams()
        params.append('categoryId', tile.key)
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

    const typeTiles: Tile[] = propertyTypesList.map((property) => ({
        kind: 'type',
        key: property.type,
        label: TypeProperty[property.type],
        icon: property.icon,
    }))

    const categoryTiles: Tile[] = leaves.map((leaf) => ({
        kind: 'category',
        key: leaf.id,
        label: leaf.name,
        icon: MODE_LEAF_ICON[leaf.slug] ?? <ShoppingBagIcon className="w-10 h-10 text-teal-500" />,
    }))

    const tiles: Tile[] = [...typeTiles, ...categoryTiles]

    return (
        <div className="px-4 md:px-8">
            <Slider {...settings} className="my-8">
                {tiles.map((tile, index) => {
                    const countLabel = (() => {
                        if (tile.kind === 'type') {
                            const typeKey = tile.key as HomePropertyTypeKey
                            const count = summary?.byType?.[typeKey]
                            if (isLoading) return 'Chargement...'
                            if (isError) return 'Indisponible'
                            return typeof count === 'number' ? `${count} Annonce${count > 1 ? 's' : ''}` : '—'
                        }
                        const leafIndex = leaves.findIndex((leaf) => leaf.id === tile.key)
                        const countQuery = leafCountQueries[leafIndex]
                        if (!countQuery || countQuery.isLoading) return 'Chargement...'
                        if (countQuery.isError) return 'Indisponible'
                        const count = countQuery.data
                        return typeof count === 'number' ? `${count} Annonce${count > 1 ? 's' : ''}` : '—'
                    })()

                    return (
                        <motion.div
                            key={`${tile.kind}-${tile.key}`}
                            className="px-2"
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                            whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.35, delay: index * 0.04 }}
                        >
                            <Card
                                className="group flex flex-col items-center cursor-pointer bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-lg"
                                onClick={() => handleClick(tile)}
                            >
                                <CardHeader className="flex flex-col items-center pt-6">
                                    <div className="relative">
                                        <CardTitle className="rounded-full w-20 h-20 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors duration-300">
                                            <div className="text-primary text-3xl group-hover:scale-110 transition-transform duration-300">
                                                {tile.icon}
                                            </div>
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-center pb-6">
                                    <h1 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 group-hover:text-primary transition-colors duration-300">
                                        {tile.label}
                                    </h1>
                                    <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                                        {countLabel}
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
