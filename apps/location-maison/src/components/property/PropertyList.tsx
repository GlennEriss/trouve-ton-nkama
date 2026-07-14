'use client'
import Link from 'next/link'
import React from 'react'
import { Button } from '../ui/button'
import PropertyStatistics from './PropertyStatistics'
import { PropertyFilter } from './PropertyFilter'
import ListPropertySection from './ListPropertySection'
import { routes } from '@/constantes/routes'
import { Home, Plus } from 'lucide-react'

export default function PropertyList() {
    const [isScrolled, setIsScrolled] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY
            const isMobile = window.innerWidth < 768 // Tailwind md breakpoint
            setIsScrolled(isMobile && scrollTop > 100)
        }

        const handleResize = () => {
            const isMobile = window.innerWidth < 768
            if (!isMobile) {
                setIsScrolled(false) // Forcer le mode normal sur desktop
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        window.addEventListener('resize', handleResize, { passive: true })
        
        // Vérification initiale
        handleScroll()
        
        return () => {
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return (
        <div className="space-y-4 mb-20">
            {/* Header moderne avec transformation au scroll - Méthode CSS */}
            <section className={`sticky top-0 md:static z-50 bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 backdrop-blur-sm border-b border-gray-200/20 dark:border-gray-700/20 shadow-lg transition-all duration-500 ${
                isScrolled ? 'py-3' : 'py-6'
            }`}>
                <div className="px-6 relative">
                    {/* Section complète - toujours présente mais invisible au scroll */}
                    <div className={`transition-all duration-500 ease-in-out ${
                        isScrolled 
                            ? 'opacity-0 scale-95 pointer-events-none absolute inset-0 px-6' 
                            : 'opacity-100 scale-100'
                    }`}>
                        <div className="flex items-center justify-between">
                            {/* Titre avec icône */}
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gradient-to-br from-[#146B67] to-[#1FA89B] rounded-xl shadow-md">
                                    <Home className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                        Mes Annonces
                                    </h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Gérez vos annonces immobilières
                                    </p>
                                </div>
                            </div>

                            {/* Bouton CTA amélioré */}
                            <Button 
                                className="bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#1FA89B] hover:to-[#146B67] text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0"
                                asChild
                            >
                                <Link href={routes.protected.publish} className="flex items-center gap-2">
                                    <Plus className="w-5 h-5" />
                                    <span className="hidden sm:inline">Publier une annonce</span>
                                    <span className="sm:hidden">Ajouter</span>
                                </Link>
                            </Button>
                        </div>

                        {/* Barre de navigation rapide */}
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200/30 dark:border-gray-700/30">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span>En ligne</span>
                            </div>
                            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Gestion immobilière
                            </div>
                        </div>
                    </div>

                    {/* Section compacte - apparaît au scroll */}
                    <div className={`transition-all duration-500 ease-in-out ${
                        isScrolled 
                            ? 'opacity-100 scale-100' 
                            : 'opacity-0 scale-95 pointer-events-none absolute inset-0 px-6'
                    }`}>
                        <div className="flex items-center justify-between">
                            {/* Icône seule */}
                            <div className="p-2 bg-gradient-to-br from-[#146B67] to-[#1FA89B] rounded-xl shadow-md">
                                <Home className="w-6 h-6 text-white" />
                            </div>

                            {/* Bouton CTA compact */}
                            <Button 
                                className="bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#1FA89B] hover:to-[#146B67] text-white font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0"
                                asChild
                            >
                                <Link href={routes.protected.publish} className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Publier une annonce</span>
                                    <span className="sm:hidden">Ajouter</span>
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sections avec correction du Dark Mode */}
            <section className="px-5 md:px-0 bg-white dark:bg-gray-900 dark:py-2">
                <PropertyStatistics />
                <PropertyFilter />
                <ListPropertySection />
            </section>
        </div>
    )
}