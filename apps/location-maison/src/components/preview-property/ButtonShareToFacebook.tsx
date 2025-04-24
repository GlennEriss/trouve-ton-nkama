'use client'
import React from 'react';
import { Property } from '@/models/annonce';
import { FaFacebookF } from 'react-icons/fa';
import { Share2 } from 'lucide-react';

export default function ButtonShareToFacebook({ property }: { property: Property }) {
    const handleShare = () => {
        const url = `https://www.logi-market.com/houseDetails/${property.id}`;
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(fbUrl, '_blank', 'width=600,height=400');
    };

    return (
        <>
            {/* <head>
                <meta property="og:title" content={property.title} />
                <meta property="og:description" content={property.description} />
                <meta property="og:image" content={property.images[0].fileURL} />
                <meta property="og:url" content={`https://www.logi-market.com/houseDetails/${property.id}`} />
                <meta property="og:type" content="website" />
            </head> */}
            <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-bleu-600"
                >
                <FaFacebookF size={18} />
            </button>
        </>

    );
}
