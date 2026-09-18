'use client'
import React from 'react';
import { Property } from '@/models/annonce';
import { FaThreads } from 'react-icons/fa6';
import { useTrackPropertyInteraction } from "@/hooks/use-track-property-interaction";

// Threads a un vrai intent web (contrairement à Instagram/TikTok, sans équivalent) —
// https://www.threads.net/intent/post?text=... ouvre directement le composeur pré-rempli.
export default function ButtonShareToThreads({ property }: Readonly<{ property: Property }>) {
    const { trackInteraction } = useTrackPropertyInteraction(property.id)

    const handleShare = () => {
        trackInteraction('threads_share');

        const url = `${process.env.NEXT_PUBLIC_HOST}/annonce/${property.id}`;
        const text = `${property.title} — à découvrir sur Trouve Ton Nkama : ${url}`;
        const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`;
        window.open(threadsUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
            <FaThreads size={18} />
        </button>
    );
}
