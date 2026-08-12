'use client'
import { Property } from '@/models/annonce'
import React from 'react'
import { CarouselPropertyDetails } from './CarouselPropertyDetails'
import { ButtonFavoris } from './ButtonFavoris'
import { GoLocation } from 'react-icons/go'
import { Separator } from '@trouve-ton-nkama/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@trouve-ton-nkama/ui/avatar'
import { generateColorFromName } from '@/lib/generateColorFromName'
import { useUserByUID } from '@/hooks/use-user-by-uid'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import { FaPhoneAlt, FaWhatsapp } from 'react-icons/fa'
import Link from 'next/link'
import Tag from './Tag'
import { MapSection } from './MapSection'
import { DetailsPropertyMobile } from './DetailsPropertyMobile'
import ButtonShareToFacebook from './ButtonShareToFacebook'
import ButtonShareToWhatsapp from './ButtonShareToWhatsapp'
import { AlertTriangle, Gift } from 'lucide-react'
import { useTrackPropertyInteraction } from '@/hooks/use-track-property-interaction'
import { getPrimaryPropertyImageUrl } from '@/lib/property-images'
import GiftModal from '../reels/gift/GiftModal'

const inter = Inter({
    subsets: ['latin'],
    weight: ['400'],
})
type PreviewPropertyMobileProps = {
    property: Property
}
export const PreviewPropertyMobile: React.FC<PreviewPropertyMobileProps> = ({ property }) => {
    const { data: user } = useUserByUID(property.createdBy)
    const { trackInteraction } = useTrackPropertyInteraction(property.id)
    const [giftOpen, setGiftOpen] = React.useState(false)
    const avatarBackground = generateColorFromName(user?.firstname ?? '');
    const announcerName = [user?.firstname, user?.lastname].filter(Boolean).join(' ') || null
    const tagSatus: Record<string, string> = {
        "FOR_RENT": "A LOUER",
        "FOR_SALE": "A VENDRE"
    }
    // Numéros WhatsApp/Appel distincts si renseignés, sinon repli sur le
    // numéro principal (comportement historique) — voir ContactSection.tsx.
    const whatsappNumber = property?.whatsappContact || property?.contact || user?.phoneNumbers?.[0]
    const callNumber = property?.callContact || property?.contact || user?.phoneNumbers?.[0]
    const primaryImageUrl = getPrimaryPropertyImageUrl(property.images)

    const handleWhatsAppClick = () => {
        trackInteraction('whatsapp_contact', {
            phoneNumber: whatsappNumber,
        })
    }

    const handlePhoneClick = () => {
        trackInteraction('phone_contact', {
            phoneNumber: callNumber,
        })
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
                                property.tags.map((tag) => (
                                    <Tag key={tag} name={tag} />
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
            
            {/* Alerte propriété archivée */}
            {property.state === 'ARCHIVED' && (
                <section className="px-2">
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-md">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                                Propriété non disponible
                            </h3>
                            <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                                Cette propriété n'est plus disponible à la location ou à la vente.
                            </p>
                        </div>
                    </div>
                </section>
            )}
            
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
                        href={whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                            `Bonjour, je suis intéressé par votre annonce "${property.title}" au prix de ${property.price.toLocaleString('fr-FR')} FCFA. Voici le lien de l'annonce : ${process.env.NEXT_PUBLIC_HOST}/houseDetails/${property.id}`
                        )}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Contacter via WhatsApp"
                        onClick={handleWhatsAppClick}
                    >
                        <div className='border border-gray-300 p-3 rounded-lg shadow-lg '>
                            <FaWhatsapp size={30} className="cursor-pointer hover:text-green-600 text-green-600" />
                        </div>
                    </Link>
                    <a
                        href={callNumber ? `tel:${callNumber}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Appeler"
                        onClick={handlePhoneClick}
                    >
                        <div className='border border-gray-300 p-3 rounded-lg shadow-lg '>
                            <FaPhoneAlt size={30} className="cursor-pointer hover:text-blue-500 text-blue-500" />
                        </div>
                    </a>
                    <button
                        type="button"
                        onClick={() => setGiftOpen(true)}
                        title="Envoyer un cadeau à l'annonceur"
                        className='border border-gray-300 p-3 rounded-lg shadow-lg'
                    >
                        <Gift size={30} className="cursor-pointer text-pink-600" />
                    </button>
                </div>

            </section>
            <GiftModal
                isOpen={giftOpen}
                onClose={() => setGiftOpen(false)}
                propertyId={property.id}
                announcerName={announcerName}
            />
            {/* Annonces avec plusieurs contacts (propriétaire/agent/famille) —
                le numéro principal ci-dessus garde sa place dans l'en-tête,
                les autres reçoivent leur propre paire WhatsApp/Appel ici. */}
            {property.additionalContacts && property.additionalContacts.length > 0 && (
                <section className='px-2 space-y-2'>
                    <h1 className='font-bold text-xl'>Autres numéros</h1>
                    {property.additionalContacts.map((number, index) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <div key={index} className='flex items-center justify-between gap-3'>
                            <span className='text-gray-500 dark:text-gray-400'>Contact {index + 2}</span>
                            <div className='flex gap-3'>
                                <Link
                                    href={`https://wa.me/${number}?text=${encodeURIComponent(
                                        `Bonjour, je suis intéressé par votre annonce "${property.title}" au prix de ${property.price.toLocaleString('fr-FR')} FCFA. Voici le lien de l'annonce : ${process.env.NEXT_PUBLIC_HOST}/houseDetails/${property.id}`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Contacter via WhatsApp"
                                    onClick={() => trackInteraction('whatsapp_contact', { phoneNumber: number })}
                                >
                                    <div className='border border-gray-300 p-3 rounded-lg shadow-lg'>
                                        <FaWhatsapp size={24} className="cursor-pointer hover:text-green-600 text-green-600" />
                                    </div>
                                </Link>
                                <a
                                    href={`tel:${number}`}
                                    title="Appeler"
                                    onClick={() => trackInteraction('phone_contact', { phoneNumber: number })}
                                >
                                    <div className='border border-gray-300 p-3 rounded-lg shadow-lg'>
                                        <FaPhoneAlt size={24} className="cursor-pointer hover:text-blue-500 text-blue-500" />
                                    </div>
                                </a>
                            </div>
                        </div>
                    ))}
                </section>
            )}
            <Separator />
            <section className='px-2'>
                <h1 className='font-bold text-xl'>Description</h1>
                <p className='text-gray-700 dark:text-gray-300'>
                    {property.description}
                </p>
            </section>
            <section className='px-2 space-y-3'>
                <h1 className='font-bold text-xl'>Aperçu</h1>
                <DetailsPropertyMobile property={property} />
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
                    image={primaryImageUrl}
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
