'use client'
import React from 'react';
import { Property } from '@/models/annonce';
import { FaFacebookF } from 'react-icons/fa';
import { useTrackPropertyInteraction } from "@/hooks/use-track-property-interaction";

export default function ButtonShareToFacebook({ property }: Readonly<{ property: Property }>) {
    const { trackInteraction } = useTrackPropertyInteraction(property.id)

    const handleShare = () => {
        // Tracker le partage Facebook
        trackInteraction('facebook_share');

        const url = `${process.env.NEXT_PUBLIC_HOST}/houseDetails/${property.id}`;
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(fbUrl, '_blank', 'width=600,height=400');
    };

    return (
        <>
            {/* <head>
                <meta property="og:title" content={property.title} />
                <meta property="og:description" content={property.description} />
                <meta property="og:image" content={property.images[0].fileURL} />
                <meta property="og:url" content={`${process.env.NEXT_PUBLIC_HOST}/houseDetails/${property.id}`} />
                <meta property="og:type" content="website" />
            </head> */}
            <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                <FaFacebookF size={18} />
            </button>
        </>

    );
}
