import { routes } from '@/constantes/routes'
import { useServerCountByProvince } from '@/hooks/use-server-count-by-province'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React from 'react'

const provinces = [
    {
        name: 'Estuaire',
        img: 'estuaire.png',
        logo: 'g1.png'
    },
    {
        name: 'Haut-Ogooué',
        img: 'haut-ogooue.png',
        logo: 'g2.png'
    },
    {
        name: 'Moyen-Ogooué',
        img: 'moyen-ogooue.png',
        logo: 'g3.png'
    },
    {
        name: 'Ngounié',
        img: 'ngounié.png',
        logo: 'g4.png'
    },
    {
        name: 'Nyanga',
        img: 'nyanga.png',
        logo: 'g5.png'
    },
    {
        name: 'Ogooué-Ivindo',
        img: 'ogooue-ivindo.png',
        logo: 'g6.png'
    },
    {
        name: 'Ogooué-Lolo',
        img: 'ogooue-lolo.png',
        logo: 'g7.png'
    },
    {
        name: 'Ogooué-Maritime',
        img: 'ogooue-maritime.png',
        logo: 'g8.png'
    },
    {
        name: 'Woleu-Ntem',
        img: 'woleu-ntem.png',
        logo: 'g9.svg'
    }
]

export default function PropertyByProvince() {
    const router = useRouter()
    return (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {
                provinces.map((province, index) => {
                    const { data: count, isLoading } = useServerCountByProvince(province.name)

                    return (
                        <div
                            key={index}
                            className='relative rounded-xl overflow-hidden w-full h-[340px] group cursor-pointer'
                            onClick={() => {
                                router.push(`${routes.public.search_property}?province=${province.name}`)
                            }}
                        >
                            <Image
                                src={`/assets/home-page/${province.img}`}
                                alt={province.name}
                                fill
                                className="transition-transform duration-300 ease-in-out group-hover:scale-110 group-focus:scale-110"
                            />
                            <div className='absolute inset-0 bg-[#093836] bg-opacity-60 transition-opacity duration-300 group-hover:bg-opacity-70 p-5 flex'>
                                <div className='mt-1'>
                                    <h1 className='text-xl font-bold text-white'>{province.name}</h1>
                                    {isLoading ? (
                                        <div className='flex items-center gap-2'>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                            </svg>
                                            <span className='text-white'>Chargement...</span>
                                        </div>
                                    ) : (
                                        <h3 className='text-white'>{(count || 0) > 0 ? `${count} Propriété(s)` : 'Aucune propriété'}</h3>
                                    )}
                                </div>
                                <div className="ml-auto relative h-14 w-14">
                                    <Image
                                        src={`/assets/home-page/${province.logo}`}
                                        alt={province.name}
                                        fill
                                        objectFit='contain'
                                    />
                                </div>

                            </div>
                        </div>
                    )
                })
            }
        </div>
    )
}
