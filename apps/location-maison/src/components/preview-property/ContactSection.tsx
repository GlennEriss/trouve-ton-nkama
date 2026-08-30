'use client'
import React, { useState } from 'react'
import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa'
import { Property } from '@/models/annonce'
import Link from 'next/link'

import { useUserByUID } from '@/hooks/use-user-by-uid'
import { useWindowSize } from "@/hooks/useSize"
import { useTrackPropertyInteraction } from "@/hooks/use-track-property-interaction"

type ContactEntry = { whatsapp?: string; call?: string }

export default function ContactSection({ property }: Readonly<{ property: Property }>) {
    const { data: user } = useUserByUID(property.createdBy)
    const { width } = useWindowSize()
    const isDesktop = width >= 1024
    const { trackInteraction } = useTrackPropertyInteraction(property.id)

    const [shownIndexes, setShownIndexes] = useState<Set<number>>(new Set())

    // Numéro principal : whatsappContact/callContact si renseignés, sinon repli
    // sur contact (comportement historique, annonces existantes non affectées)
    // — voir models/annonce.d.ts. Chaque numéro de additionalContacts (annonces
    // avec plusieurs contacts : propriétaire/agent/famille) reçoit sa propre
    // paire de boutons WhatsApp/Appel.
    const primaryFallback = property?.contact || user?.phoneNumbers?.[0]
    const contacts: ContactEntry[] = [
        { whatsapp: property?.whatsappContact || primaryFallback, call: property?.callContact || primaryFallback },
        ...(property?.additionalContacts ?? []).map((number) => ({ whatsapp: number, call: number })),
    ]
    const showLabels = contacts.length > 1

    const handleWhatsAppClick = (number?: string) => {
        trackInteraction('whatsapp_contact', { phoneNumber: number });
    };

    const handlePhoneClick = (index: number, number?: string) => {
        trackInteraction('phone_contact', { phoneNumber: number });
        if (!isDesktop) {
            setShownIndexes((prev) => new Set(prev).add(index));
        }
    };

    return (
        <section className="flex flex-col gap-3 rounded-lg p-5 shadow">
            <h1 className="font-bold">Choisissez un moyen de contact</h1>
            <div className="flex flex-col gap-3">
                {contacts.map((entry, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={index} className="flex flex-col gap-1">
                        {showLabels && (
                            <span className="text-xs font-medium text-gray-500">
                                {index === 0 ? 'Contact principal' : `Contact ${index + 1}`}
                            </span>
                        )}
                        <div className="flex gap-3">
                            <Link
                                href={entry.whatsapp ? `https://wa.me/${entry.whatsapp}?text=${encodeURIComponent(
                                    `Bonjour, je suis intéressé par votre annonce "${property.title}" au prix de ${property.price.toLocaleString('fr-FR')} FCFA. Voici le lien de l'annonce : ${process.env.NEXT_PUBLIC_HOST}/annonce/${property.id}`
                                )}` : '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Contacter via WhatsApp"
                                onClick={() => handleWhatsAppClick(entry.whatsapp)}
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
                                    {isDesktop && <span className="font-medium">WhatsApp</span>}
                                </div>
                            </Link>
                            {shownIndexes.has(index) ? (
                                <div className={`flex items-center gap-2 border border-gray-300 ${
                                    isDesktop ? 'px-4 py-3' : 'px-4 py-3'
                                } rounded-lg shadow-lg`}>
                                    <FaPhoneAlt size={isDesktop ? 22 : 30} className="text-primary" />
                                    <span className="font-medium select-all">{entry.call}</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handlePhoneClick(index, entry.call)}
                                    className={`flex items-center gap-2 border border-gray-300 ${
                                        isDesktop ? 'px-4 py-3' : 'p-3'
                                    } rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
                                    title="Afficher le numéro de téléphone"
                                >
                                    <FaPhoneAlt size={isDesktop ? 22 : 30} className="text-primary" />
                                    {isDesktop && <span className="font-medium">Appeler</span>}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
