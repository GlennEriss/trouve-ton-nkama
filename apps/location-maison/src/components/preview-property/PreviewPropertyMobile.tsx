'use client'
import { Property } from '@/models/annonce'
import React from 'react'
import { CarouselPropertyDetails } from './CarouselPropertyDetails'
import { ButtonFavoris } from './ButtonFavoris'
import { GoLocation } from 'react-icons/go'
import { Separator } from '../ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { generateColorFromName } from '@/lib/generateColorFromName'
import { useUserByUID } from '@/hooks/use-user-by-uid'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import { FaPhoneAlt, FaWhatsapp } from 'react-icons/fa'
import Link from 'next/link'
import { Button } from '../ui/button'
import { AiOutlineMail } from 'react-icons/ai'
import Tag from './Tag'
import { MapSection } from './MapSection'
import DetailsProperty from './DetailsProperty'
import { DetailsPropertyMobile } from './DetailsPropertyMobile'
import ButtonShareToFacebook from './ButtonShareToFacebook'
import ButtonShareToWhatsapp from './ButtonShareToWhatsapp'

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})
type PreviewPropertyMobileProps = {
    property: Property
}
export const PreviewPropertyMobile: React.FC<PreviewPropertyMobileProps> = ({ property }) => {
    const { data: user } = useUserByUID(property.createdBy)
    const avatarBackground = generateColorFromName(user?.firstname ?? '');
    const tagSatus: Record<string, string> = {
        "FOR_RENT": "A LOUER",
        "FOR_SALE": "A VENDRE"
    }
    return (
        <div className={cn('space-y-8 mb-20', inter.className)}>
            <section className='space-y-3'>
                <CarouselPropertyDetails images={property.images} />
                <div className='px-2'>
                    <section className='flex justify-between items-start'>
                        <div className='flex flex-wrap gap-3 items-center mt-1.5'>
                            <Tag name={tagSatus[property.status as string]} />
                            {
                                property.tags.map((tag, key) => (
                                    <Tag key={key} name={tag} />
                                ))
                            }
                        </div>
                        <ButtonFavoris idProperty={property.id!} />

                    </section>
                    <div>
                        <h1 className='text-xl font-bold text-gray-900 dark:text-white'>{property.title}</h1>
                        <h1 className='text-2xl font-bold text-green-700'>
                            FCFA {property.price.toLocaleString('fr-FR')}
                        </h1>
                        <div className='flex items-center gap-2'>
                            <GoLocation size={25} color='gray' />
                            <h2 className='md:text-lg text-justify text-gray-500 dark:text-gray-400'>{property.street}, {property.city} {property.province}</h2>
                        </div>
                    </div>
                    <p className='flex flex-col text-gray-500 dark:text-gray-400 text-md text-justify italic mt-1'>
                        <span>
                            Créé le: {property.createdAt ? new Date(property.createdAt.seconds * 1000).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue'}
                        </span>
                        <span>
                            Modifié le: {property.updatedAt ? new Date(property.updatedAt.seconds * 1000).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue'}
                        </span>
                    </p>
                </div>
            </section>
            <Separator />
            <section className='flex items-center justify-between px-2'>
                <div className='flex gap-2'>
                    <Avatar className='h-[60px] w-[60px]'>
                        <AvatarImage src={user?.image ?? ''} alt={(user?.firstname?.split(' ')[0] ?? '') + ' ' + (user?.lastname?.split(' ')[0] ?? '')} />
                        <AvatarFallback
                            style={{ backgroundColor: avatarBackground }}
                            className='text-2xl font-bold text-white'>
                            {user?.firstname?.at(0) ?? ''}
                        </AvatarFallback>
                    </Avatar>
                    <div className='flex flex-col text-lg'>
                        <span className='font-bold'>
                            {[user?.firstname?.split(' ')[0], user?.firstname?.split(' ')[1]].filter(Boolean).join(' ')}
                        </span>
                        <span className='text-gray-500'>
                            {[user?.lastname?.split(' ')[0], user?.lastname?.split(' ')[1]].filter(Boolean).join(' ')}
                        </span>
                    </div>
                </div>
                <div className='flex gap-3'>
                    <Link
                        href={property?.contact ?? user?.phoneNumbers?.[0] ? `https://wa.me/${property.contact ?? user?.phoneNumbers[0]}?text=${encodeURIComponent(
                            `Bonjour, je suis intéressé par votre annonce "${property.title}" au prix de ${property.price.toLocaleString('fr-FR')} FCFA. Voici le lien de l'annonce : https://www.logi-market.com/houseDetails/${property.id}`
                        )}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Contacter via WhatsApp"
                    >
                        <div className='border border-gray-300 p-3 rounded-lg shadow-lg '>
                            <FaWhatsapp size={30} className="cursor-pointer hover:text-green-600 text-green-600" />
                        </div>
                    </Link>
                    <a
                        href={property?.contact ?? user?.phoneNumbers?.[0] ? `tel:${property.contact ?? user?.phoneNumbers[0]}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Appeler"
                    >
                        <div className='border border-gray-300 p-3 rounded-lg shadow-lg '>
                            <FaPhoneAlt size={30} className="cursor-pointer hover:text-blue-500 text-blue-500" />
                        </div>
                    </a>
                </div>

            </section>
            <Separator />
            <section className='px-2'>
                <h1 className='font-bold text-xl'>Description</h1>
                <p className='text-gray-700 dark:text-gray-300'>
                    {property.description}
                </p>
            </section>
            <section className='px-2 space-y-3'>
                <h1 className='font-bold text-xl'>Aperçu</h1>
                <DetailsPropertyMobile property={property as any} />
            </section>
            <section className='px-2 space-y-3'>
                <h1 className='font-bold text-xl'>Partager l'annonce</h1>
                <div className="justify-end flex gap-2 bg-white rounded">
                    <ButtonShareToFacebook property={property} />
                    <ButtonShareToWhatsapp property={property} />
                </div>
            </section>
            {
                property.additionnalInformation && (
                    <section className="flex flex-col gap-5 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
                        <h1 className='font-bold text-xl'>Localisation</h1>
                        <p className='text-gray-700 dark:text-gray-300'>
                            {property.additionnalInformation}
                        </p>
                    </section>
                )
            }
            <section>
                <MapSection
                    image={property.images[0].fileURL}
                    additionalInformation={property?.additionnalInformation}
                    street={property.street}
                    city={property.city}
                    province={property.province}
                    latitude={property.latitude}
                    longitude={property.longitude}
                    countryCode={property.countryCode}
                />
            </section>
        </div>
    )
}
