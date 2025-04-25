'use client'
import React from 'react'
import { FaWhatsapp, FaFacebookMessenger, FaPhoneAlt } from 'react-icons/fa'
import { AiOutlineMail } from 'react-icons/ai'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Property } from '@/models/annonce'

export default function ContactSection({property}: {property: Property}) {
    const { user } = useCurrentUser()
    return (
        <section className="flex flex-col gap-3 rounded-lg p-5 shadow">
            <h1 className="font-bold">Contacts</h1>
            <div className="flex gap-4">
                {/* WhatsApp */}
                <a
                    href={`https://wa.me/${user?.phoneNumbers[0]}?text=${encodeURIComponent(
                      `Bonjour, je suis intéressé par votre annonce "${property.title}" au prix de ${property.price.toLocaleString('fr-FR')} FCFA. Voici le lien : https://www.logi-market.com/houseDetails/${property.id}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Contacter via WhatsApp"
                >
                    <FaWhatsapp size={30} className="cursor-pointer hover:text-green-600 text-green-600" />
                </a>

                {/* Facebook Messenger */}
                {/* <a
                    href={`https://m.me/${user?.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Contacter via Facebook Messenger"
                >
                    <FaFacebookMessenger size={30} className="cursor-pointer hover:text-blue-600" />
                </a> */}

                {/* Gmail */}
                <a
                    href={`mailto:${user?.email}?subject=${encodeURIComponent(`Intérêt pour l'annonce "${property.title}"`)}&body=${encodeURIComponent(`Bonjour,\n\nJe suis intéressé(e) par votre annonce intitulée "${property.title}" au prix de ${property.price.toLocaleString('fr-FR')} FCFA.\n\nVoici le lien de l'annonce : https://www.logi-market.com/houseDetails/${property.id}\n\nCordialement,`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Contacter via Gmail"
                >
                    <AiOutlineMail size={30} className="cursor-pointer hover:text-red-600 text-red-600" />
                </a>

                {/* Appeler directement */}
                <a
                    href={`tel:${user?.phoneNumbers[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Appeler"
                >
                    <FaPhoneAlt size={27} className="cursor-pointer hover:text-blue-500 text-blue-500" />
                </a>
            </div>
        </section>
    )
}
