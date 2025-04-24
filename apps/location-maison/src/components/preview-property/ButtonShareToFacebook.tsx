'use client'
import React from 'react';
import { Property } from '@/models/annonce';
import { FaFacebookF } from 'react-icons/fa';
import { Share2 } from 'lucide-react';
import Head from 'next/head';

export default function ButtonShareToFacebook({ property }: { property: Property }) {
    const handleShare = () => {
        const url = `https://www.logi-market.com/houseDetails/${property.id}`;
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(fbUrl, '_blank', 'width=600,height=400');
    };

    return (
        <>
            <Head>
                <meta property="og:title" content={property.title} />
                <meta property="og:description" content={property.description} />
                <meta property="og:image" content={property.images[0].fileURL} />
                <meta property="og:url" content={`https://www.logi-market.com/houseDetails/${property.id}`} />
                <meta property="og:type" content="website" />
            </Head>
            <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 bg-blue-600 text-white text-base rounded hover:bg-blue-700 transition-colors"
            >
                <Share2 size={20} />
                <FaFacebookF size={18} />

            </button>
        </>

    );
}
