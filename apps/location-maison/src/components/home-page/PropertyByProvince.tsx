import { useServerCountByProvince } from '@/hooks/use-server-count-by-province'
import Image from 'next/image'
import React from 'react'

const provinces = [
    {
        name: 'Estuaire',
        img: 'estuaire.png'
    },
    {
        name: 'Haut-Ogooué',
        img: 'haut-ogooue.png'
    },
    {
        name: 'Moyen-Ogooué',
        img: 'moyen-ogooue.png'
    },
    {
        name: 'Ngounié',
        img: 'ngounié.png'
    },
    {
        name: 'Nyanga',
        img: 'nyanga.png'
    },
    {
        name: 'Ogooué-Ivindo',
        img: 'ogooue-ivindo.png'
    },
    {
        name: 'Ogooué-Lolo',
        img: 'ogooue-lolo.png'
    },
    {
        name: 'Ogooué-Maritime',
        img: 'ogooue-maritime.png'
    },
    {
        name: 'Woleu-Ntem',
        img: 'woleu-ntem.png'
    }
]

export default function PropertyByProvince() {
    return (
        <div className='grid grid-cols-1 gap-5'>
            {
                provinces.map((province, index) => {
                    const { data: count, isLoading } = useServerCountByProvince(province.name)

                    return (
                        <div
                            key={index}
                            className='relative rounded-xl overflow-hidden w-full h-[340px] group'
                        >
                            <Image
                                src={`/assets/home-page/${province.img}`}
                                alt={province.name}
                                fill
                                className="transition-transform duration-300 ease-in-out group-hover:scale-110 group-focus:scale-110"
                            />
                            <div className='absolute inset-0 bg-[#093836] bg-opacity-60 transition-opacity duration-300 group-hover:bg-opacity-70 p-5'>
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
                        </div>
                    )
                })
            }
        </div>
    )
}
