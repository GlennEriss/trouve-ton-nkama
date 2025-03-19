'use client'
import React from 'react'
import { FaWhatsapp, FaFacebookMessenger, FaPhoneAlt } from 'react-icons/fa'
import { AiOutlineMail } from 'react-icons/ai'
import { useCurrentUser } from '@/hooks/use-current-user'

export default function ContactSection() {
    const { user } = useCurrentUser()
    return (
        <section className="flex flex-col gap-3 rounded-lg p-5 shadow">
            <h1 className="font-bold">Contacts</h1>
            <div className="flex gap-4">
                {/* WhatsApp */}
                <a
                    href={`https://wa.me/${user?.phoneNumbers[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Contacter via WhatsApp"
                >
                    <FaWhatsapp size={30} className="cursor-pointer hover:text-green-600" />
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
                    href={`mailto:${user?.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Contacter via Gmail"
                >
                    <AiOutlineMail size={30} className="cursor-pointer hover:text-red-600" />
                </a>

                {/* Appeler directement */}
                <a
                    href={`tel:${user?.phoneNumbers[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Appeler"
                >
                    <FaPhoneAlt size={30} className="cursor-pointer hover:text-blue-500" />
                </a>
            </div>
        </section>
    )
}
