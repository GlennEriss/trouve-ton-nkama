'use client'
import React, { useState } from 'react'
import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa'
import { Property } from '@/models/annonce'
import Link from 'next/link'

import { useUserByUID } from '@/hooks/use-user-by-uid'
import { useWindowSize } from "@/hooks/useSize"

export default function ContactSection({ property }: Readonly<{ property: Property }>) {
    const { data: user } = useUserByUID(property.createdBy)
    const { width } = useWindowSize()
    const isDesktop = width >= 1024

    const [showNumber, setShowNumber] = useState(false)
    const phoneNumber = property?.contact ?? user?.phoneNumbers?.[0]

    return (
        <section className="flex flex-col gap-3 rounded-lg p-5 shadow">
            <h1 className="font-bold">Choisissez un moyen de contact</h1>
            <div className='flex gap-3'>
                    <Link
                        href={property?.contact ?? user?.phoneNumbers?.[0] ? `https://wa.me/${property.contact ? property.contact : user?.phoneNumbers[0]}?text=${encodeURIComponent(
                            `Bonjour, je suis intéressé par votre annonce "${property.title}" au prix de ${property.price.toLocaleString('fr-FR')} FCFA. Voici le lien de l'annonce : https://www.logi-market.com/houseDetails/${property.id}`
                        )}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Contacter via WhatsApp"
                    >
                        <div
                            className={`flex items-center gap-2 border border-gray-300 ${
                                isDesktop ? 'px-4 py-3' : 'p-3'
                            } rounded-lg shadow-lg`}
                        >
                            <FaWhatsapp
                                size={isDesktop ? 22 : 30}
                                className="text-green-600"
                            />
                            {isDesktop && phoneNumber && (
                                <span className="font-medium select-all">
                                    {phoneNumber}
                                </span>
                            )}
                        </div>
                    </Link>
                    {isDesktop ? (
                        phoneNumber && (
                            <div className="flex items-center gap-2 border border-gray-300 px-4 py-3 rounded-lg shadow-lg">
                                <FaPhoneAlt size={22} className="text-[#146B67]" />
                                <span className="font-medium select-all">{phoneNumber}</span>
                            </div>
                        )
                    ) : (
                        <>
                            {showNumber ? (
                                <div className="border border-gray-300 px-4 py-3 rounded-lg shadow-lg">
                                    <span className="font-medium select-all">{phoneNumber}</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowNumber(true)}
                                    className="border border-gray-300 p-3 rounded-lg shadow-lg"
                                    title="Afficher le numéro"
                                >
                                    <FaPhoneAlt size={30} className="text-[#146B67]" />
                                </button>
                            )}
                        </>
                    )}
                </div>
        </section>
    )
}
