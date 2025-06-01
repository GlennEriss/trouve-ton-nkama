'use client'
import React from 'react'
import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa'
import { Property } from '@/models/annonce'
import Link from 'next/link'

import { useUserByUID } from '@/hooks/use-user-by-uid'
export default function ContactSection({ property }: { property: Property }) {
    const { data: user } = useUserByUID(property.createdBy)
    return (
        <section className="flex flex-col gap-3 rounded-lg p-5 shadow">
            <h1 className="font-bold">Choisissez un moyen de contact</h1>
            <div className='flex gap-3'>
                    <Link
                        href={property?.contact || user?.phoneNumbers?.[0] ? `https://wa.me/${property.contact ? property.contact : user?.phoneNumbers[0]}?text=${encodeURIComponent(
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
                        href={property?.contact || user?.phoneNumbers?.[0] ? `tel:${property.contact ? property.contact : user?.phoneNumbers[0]}` : '#'}
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
    )
}
