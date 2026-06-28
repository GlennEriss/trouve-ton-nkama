'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '../ui/carousel'
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react'
import { useSwipeable } from 'react-swipeable'

export default function CarouselProperty({ images }: Readonly<{ images: string[] }>) {
    const imageUrls = images.filter((image) => typeof image === 'string' && image.trim().length > 0)
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
 
    const openPreview = (image: string) => {
        setSelectedImage(image);
        setIsPreviewOpen(true);
        // Désactiver le scroll quand la preview est ouverte
        document.body.style.overflow = 'hidden';
    };
 
    const closePreview = () => {
        setSelectedImage(null);
        setIsPreviewOpen(false);
        // Réactiver le scroll
        document.body.style.overflow = 'unset';
    };

    const selectedIndex = selectedImage ? imageUrls.indexOf(selectedImage) : -1;

    const goToNextImage = () => {
        if (selectedIndex < imageUrls.length - 1) {
            setSelectedImage(imageUrls[selectedIndex + 1]);
        } else {
            // Retour à la première image si on est à la dernière
            setSelectedImage(imageUrls[0]);
        }
    };

    const goToPreviousImage = () => {
        if (selectedIndex > 0) {
            setSelectedImage(imageUrls[selectedIndex - 1]);
        } else {
            // Aller à la dernière image si on est à la première
            setSelectedImage(imageUrls[imageUrls.length - 1]);
        }
    };

    // Configuration du swipe pour la preview
    const handlers = useSwipeable({
        onSwipedLeft: () => goToNextImage(),
        onSwipedRight: () => goToPreviousImage(),
        preventScrollOnSwipe: true,
        trackMouse: true
    });

    // Gestion des touches du clavier pour la navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPreviewOpen) return;
            
            switch(e.key) {
                case 'ArrowRight':
                    goToNextImage();
                    break;
                case 'ArrowLeft':
                    goToPreviousImage();
                    break;
                case 'Escape':
                    closePreview();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPreviewOpen, selectedIndex]);

    if (imageUrls.length === 0) {
        return (
            <div className="flex h-[260px] w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400 md:h-[320px] xl:h-[360px]">
                <div className="flex flex-col items-center gap-2 text-center">
                    <ImageOff className="h-10 w-10" />
                    <span className="text-sm font-medium">Aucune photo disponible</span>
                </div>
            </div>
        )
    }

    return (
        <>
            <Carousel className="w-full">
                <CarouselContent className='-ml-2 md:-ml-4'>
                    {imageUrls.map((image, index) => (
                        <CarouselItem 
                            key={image} 
                            className='pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3'
                        >
                            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                                <Image
                                    src={image}
                                    alt={`Image ${index + 1}`}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    className='object-cover hover:scale-110 transition-transform duration-300 cursor-pointer'
                                    onClick={() => openPreview(image)}
                                    priority={index < 3} // Priorité aux 3 premières images
                                />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-4 h-8 w-8 bg-white/80 hover:bg-white border-none shadow-md" />
                <CarouselNext className="hidden md:flex -right-4 h-8 w-8 bg-white/80 hover:bg-white border-none shadow-md" />
            </Carousel>

            {/* Preview en plein écran */}
            {isPreviewOpen && selectedImage && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center">
                    {/* Barre de navigation supérieure */}
                    <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
                        <span className="text-white text-sm">
                            {selectedIndex + 1} / {imageUrls.length}
                        </span>
                        <button
                            onClick={closePreview}
                            className="text-white hover:text-gray-300 transition-colors z-10"
                            aria-label="Fermer"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Boutons de navigation */}
                    <button
                        onClick={goToPreviousImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                        aria-label="Image précédente"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                        onClick={goToNextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                        aria-label="Image suivante"
                    >
                        <ChevronRight className="w-6 h-6 text-white" />
                    </button>

                    <div 
                        className="relative w-full h-full flex flex-col items-center justify-center px-4"
                        {...handlers}
                    >
                        {/* Image */}
                        <div className="relative w-full h-full flex items-center justify-center">
                            <Image
                                src={selectedImage}
                                alt="Preview"
                                fill
                                sizes="100vw"
                                className="object-contain"
                                priority
                            />
                        </div>

                        {/* Miniatures en bas */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent overflow-x-auto z-10">
                            <div className="flex gap-2 justify-center">
                                {imageUrls.map((img, idx) => (
                                    <button
                                        key={img}
                                        onClick={() => setSelectedImage(img)}
                                        className={`relative w-16 h-16 rounded-lg overflow-hidden transition-opacity ${
                                            selectedImage === img ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                                        }`}
                                    >
                                        <Image
                                            src={img}
                                            alt={`Miniature ${idx + 1}`}
                                            fill
                                            sizes="64px"
                                            className="object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
