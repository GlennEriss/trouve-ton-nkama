'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '../ui/carousel'
 

export default function CarouselProperty({ images }: { images: string[] }) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
 
    const openPreview = (image: string) => {
        setSelectedImage(image);
        setIsPreviewOpen(true);
    };
 
    const closePreview = () => {
        setSelectedImage(null);
        setIsPreviewOpen(false);
    };

    return (
        <>
            <Carousel>
                <CarouselContent className='relative'>
                    {images.map((image, index) => (
                    <CarouselItem className='md:basis-1/2 xl:basis-1/3' key={index}>
                        <Image
                            src={image}
                            sizes="100vw"
                            alt="alt"
                            width={0}
                            height={0}
                            objectFit='cover'
                            quality={100}
                            priority
                            className='w-[500px] h-[400px] cursor-pointer transition-transform duration-300 hover:scale-105'
                            onClick={() => openPreview(image)}
                        />
                    </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-0 top-1/2 transform -translate-y-1/2 bg-gray-500 text-white px-3 py-2 rounded-none h-10 w-10" />
                <CarouselNext className="right-0 top-1/2 transform -translate-y-1/2 bg-gray-500 text-white px-3 py-2 rounded-none h-10 w-10" />
            </Carousel>

            {/* Fullscreen Image Preview */}
            {isPreviewOpen && selectedImage && (
                <div className="fixed inset-0 w-screen h-screen bg-black bg-opacity-90 flex justify-center items-center z-50">
                    <div className="relative w-full h-full flex justify-center items-center">
                        <button
                            onClick={closePreview}
                            className="absolute top-6 right-6 bg-gray-200 hover:bg-gray-300 rounded-full p-3 text-black"
                        >
                            ✕
                        </button>
                        <Image
                            src={selectedImage}
                            sizes="100vw"
                            alt="Preview"
                            width={1200}
                            height={800}
                            objectFit="contain"
                            className="max-w-full max-h-full"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
