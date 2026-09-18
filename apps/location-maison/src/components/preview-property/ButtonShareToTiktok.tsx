'use client'
import React, { useState } from 'react';
import { Property } from '@/models/annonce';
import { FaTiktok } from 'react-icons/fa6';
import { Check } from 'lucide-react';
import { useTrackPropertyInteraction } from "@/hooks/use-track-property-interaction";
import { shareViaNativeOrCopy } from '@/lib/social-share-fallback';

// TikTok n'a pas d'intent web pour partager un lien externe (voir social-share-fallback.ts) :
// ouvre la feuille de partage native (l'utilisateur choisit TikTok s'il est installé), ou copie
// le lien en repli sur desktop — même pattern déjà utilisé pour TikTok dans ReelsFeedClient.tsx.
export default function ButtonShareToTiktok({ property }: Readonly<{ property: Property }>) {
    const { trackInteraction } = useTrackPropertyInteraction(property.id)
    const [hasCopied, setHasCopied] = useState(false)

    const handleShare = async () => {
        trackInteraction('tiktok_share');

        const url = `${process.env.NEXT_PUBLIC_HOST}/annonce/${property.id}`;
        const result = await shareViaNativeOrCopy({
            url,
            title: property.title,
            text: `${property.title} — à découvrir sur Trouve Ton Nkama`,
        });

        if (result === 'copy') {
            setHasCopied(true);
            window.setTimeout(() => setHasCopied(false), 1800);
        }
    };

    return (
        <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            title={hasCopied ? 'Lien copié — colle-le dans TikTok' : 'Partager sur TikTok'}
        >
            {hasCopied ? <Check size={18} /> : <FaTiktok size={18} />}
        </button>
    );
}
