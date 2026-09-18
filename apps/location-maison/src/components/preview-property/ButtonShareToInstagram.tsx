'use client'
import React, { useState } from 'react';
import { Property } from '@/models/annonce';
import { FaInstagram } from 'react-icons/fa6';
import { Check } from 'lucide-react';
import { useTrackPropertyInteraction } from "@/hooks/use-track-property-interaction";
import { shareViaNativeOrCopy } from '@/lib/social-share-fallback';

// Instagram n'a pas d'intent web pour partager un lien externe (voir social-share-fallback.ts) :
// ouvre la feuille de partage native (l'utilisateur choisit Instagram s'il est installé), ou
// copie le lien en repli sur desktop — jamais un lien direct pré-rempli vers l'app.
export default function ButtonShareToInstagram({ property }: Readonly<{ property: Property }>) {
    const { trackInteraction } = useTrackPropertyInteraction(property.id)
    const [hasCopied, setHasCopied] = useState(false)

    const handleShare = async () => {
        trackInteraction('instagram_share');

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
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded hover:opacity-90"
            title={hasCopied ? 'Lien copié — colle-le dans Instagram' : 'Partager sur Instagram'}
        >
            {hasCopied ? <Check size={18} /> : <FaInstagram size={18} />}
        </button>
    );
}
