import { routes } from '@/constantes/routes'
import { HOME_PROVINCES, HomeProvinceName } from '@/constantes/home-page'
import { useServerPropertyCountSummary } from '@/hooks/use-server-property-count-summary'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React from 'react'

export default function PropertyByProvince() {
    const router = useRouter()
    const {
        data: summary,
        isLoading,
        isError,
    } = useServerPropertyCountSummary()
    const shouldReduceMotion = useReducedMotion()

    return (
        <div className='grid grid-cols-1 gap-5 grid-provinces'>
            {
                HOME_PROVINCES.map((province, index) => {
                    const provinceName = province.name as HomeProvinceName
                    const count = summary?.byProvince?.[provinceName]
                    const label = isLoading
                        ? 'Chargement...'
                        : isError
                            ? 'Indisponible'
                            : typeof count === 'number'
                                ? count > 0
                                    ? `${count} Annonce(s)`
                                    : 'Aucune annonce'
                                : '—'

                    return (
                        <motion.button
                            key={province.name}
                            className='relative rounded-xl overflow-hidden w-full h-[340px] group cursor-pointer border-none bg-transparent p-0'
                            onClick={() => {
                                const params = new URLSearchParams()
                                params.append("province", province.name)
                                router.push(`${routes.public.search_property}?${params.toString()}`)
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    const params = new URLSearchParams()
                                    params.append("province", province.name)
                                    router.push(`${routes.public.search_property}?${params.toString()}`);
                                }
                            }}
                            aria-label={`Rechercher des propriétés dans la province ${province.name}`}
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                            whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.25 }}
                            transition={{ duration: 0.35, delay: index * 0.04 }}
                        >
                            {/* Logo comme image principale */}
                            <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-gray-100">
                                <Image
                                    src={`/assets/home-page/${province.logo}`}
                                    alt={`Logo ${province.name}`}
                                    fill
                                    className="transition-transform duration-300 ease-in-out group-hover:scale-105 group-focus:scale-105 object-contain p-8"
                                />
                            </div>
                            
                            {/* Overlay avec informations */}
                            <div className='absolute inset-0 bg-gradient-to-t from-[#093836] via-[#093836]/80 to-transparent transition-opacity duration-300 group-hover:from-[#093836]/90 group-hover:via-[#093836]/85 p-5 flex flex-col justify-end'>
                                <div className='mb-2'>
                                    <h1 className='text-xl font-bold text-white mb-2'>{province.name}</h1>
                                    {isLoading ? (
                                        <div className='flex items-center gap-2'>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                            </svg>
                                            <span className='text-white text-sm'>Chargement...</span>
                                        </div>
                                    ) : (
                                        <h3 className='text-white text-sm font-medium'>{label}</h3>
                                    )}
                                </div>
                            </div>
                        </motion.button>
                    )
                })
            }
        </div>
    )
}
