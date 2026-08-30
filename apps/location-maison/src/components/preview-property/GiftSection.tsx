'use client'
import { useState } from 'react'
import { Gift } from 'lucide-react'
import { Property } from '@/models/annonce'
import { Button } from '@trouve-ton-nkama/ui/button'
import { useUserByUID } from '@/hooks/use-user-by-uid'
import { getUserDisplayName } from '@/lib/user-display-name'
import GiftModal from '@/components/reels/gift/GiftModal'

/**
 * Section dédiée, séparée du choix d'un moyen de contact (ContactSection.tsx) : envoyer un
 * cadeau à l'annonceur n'est pas un canal de contact, le mélanger dans la même rangée de
 * boutons (WhatsApp/Appeler/Cadeau) le faisait passer pour l'un d'eux.
 */
export default function GiftSection({ property }: Readonly<{ property: Property }>) {
    const { data: user } = useUserByUID(property.createdBy)
    const [giftOpen, setGiftOpen] = useState(false)
    const announcerName = getUserDisplayName(user)

    return (
        <section className="flex flex-col gap-3 rounded-lg p-5 shadow bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950/50">
                    <Gift className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                    <h2 className="font-bold text-gray-900 dark:text-white">Envoyer un cadeau</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Une façon de soutenir {announcerName ?? "l'annonceur"}, sans passer par un contact direct.
                    </p>
                </div>
            </div>
            <Button
                type="button"
                variant="outline"
                onClick={() => setGiftOpen(true)}
                className="self-start gap-2 border-pink-200 text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:border-pink-900 dark:hover:bg-pink-950/50"
            >
                <Gift className="h-4 w-4" /> Offrir un cadeau
            </Button>

            <GiftModal
                isOpen={giftOpen}
                onClose={() => setGiftOpen(false)}
                propertyId={property.id}
                announcerName={announcerName}
            />
        </section>
    )
}
