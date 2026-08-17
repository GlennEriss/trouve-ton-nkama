'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from '@trouve-ton-nkama/ui/carousel'
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react'
import { useSwipeable } from 'react-swipeable'

// La lightbox doit passer au-dessus de la navbar desktop, qui est `sticky md:z-50`
// (Navbar.tsx). À z-50 comme elle, la barre du haut de la lightbox — donc son bouton de
// fermeture — se retrouvait masquée par la navbar sur ordinateur, alors que sur mobile la
// navbar est `hidden` et le bouton restait visible. Même échelle que MobileSidebar.
const LIGHTBOX_Z_INDEX = 10050

export default function CarouselProperty({ images }: Readonly<{ images: string[] }>) {
    const imageUrls = images.filter((image) => typeof image === 'string' && image.trim().length > 0)
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [api, setApi] = useState<CarouselApi>();
    const [currentSlide, setCurrentSlide] = useState(0);
    // Le portail ne peut cibler document.body qu'une fois monté côté client.
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Synchronise la bande de miniatures avec la position du carrousel.
    useEffect(() => {
        if (!api) return;

        const onSelect = () => setCurrentSlide(api.selectedScrollSnap());
        onSelect();
        api.on('select', onSelect);
        return () => {
            api.off('select', onSelect);
        };
    }, [api]);

    const openPreview = (image: string) => {
        setSelectedImage(image);
        setIsPreviewOpen(true);
        // Désactiver le scroll quand la preview est ouverte
        document.body.style.overflow = 'hidden';
    };

    const closePreview = useCallback(() => {
        setSelectedImage(null);
        setIsPreviewOpen(false);
        // Réactiver le scroll
        document.body.style.overflow = 'unset';
    }, []);

    // Filet de sécurité : si le composant est démonté preview ouverte, le scroll doit revenir.
    useEffect(() => () => {
        document.body.style.overflow = 'unset';
    }, []);

    const selectedIndex = selectedImage ? imageUrls.indexOf(selectedImage) : -1;

    const goToNextImage = useCallback(() => {
        if (selectedIndex < 0) return;
        setSelectedImage(imageUrls[(selectedIndex + 1) % imageUrls.length]);
    }, [imageUrls, selectedIndex]);

    const goToPreviousImage = useCallback(() => {
        if (selectedIndex < 0) return;
        setSelectedImage(imageUrls[(selectedIndex - 1 + imageUrls.length) % imageUrls.length]);
    }, [imageUrls, selectedIndex]);

    // Configuration du swipe pour la preview
    const handlers = useSwipeable({
        onSwipedLeft: () => goToNextImage(),
        onSwipedRight: () => goToPreviousImage(),
        preventScrollOnSwipe: true,
        trackMouse: true
    });

    // Gestion des touches du clavier pour la navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPreviewOpen) return;

            switch (e.key) {
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
    }, [isPreviewOpen, goToNextImage, goToPreviousImage, closePreview]);

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

    const lightbox = isPreviewOpen && selectedImage ? (
        <div
            className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center"
            style={{ zIndex: LIGHTBOX_Z_INDEX }}
            role="dialog"
            aria-modal="true"
            aria-label="Photo en plein écran"
            // Fermeture au clic sur le fond : sur une photo plein écran, c'est le geste que la
            // plupart des gens tentent avant de chercher un bouton.
            onClick={closePreview}
        >
            {/* Barre supérieure */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center gap-4 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
                <span className="rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                    {selectedIndex + 1} / {imageUrls.length}
                </span>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        closePreview();
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/70"
                    aria-label="Fermer la photo"
                >
                    <X size={22} />
                </button>
            </div>

            {/* Boutons de navigation, seulement s'il y a plusieurs photos */}
            {imageUrls.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            goToPreviousImage();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                        aria-label="Image précédente"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            goToNextImage();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                        aria-label="Image suivante"
                    >
                        <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                </>
            )}

            <div
                className="relative w-full h-full flex flex-col items-center justify-center px-4"
                {...handlers}
            >
                {/* Image : le clic dessus ne doit pas fermer, seul le fond ferme. */}
                <div
                    className="relative w-full h-full flex items-center justify-center"
                    onClick={(event) => event.stopPropagation()}
                >
                    <Image
                        src={selectedImage}
                        alt="Photo de l'annonce en plein écran"
                        fill
                        sizes="100vw"
                        className="object-contain"
                        priority
                    />
                </div>

                {/* Miniatures en bas */}
                {imageUrls.length > 1 && (
                    <div
                        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent overflow-x-auto z-10"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex gap-2 justify-center">
                            {imageUrls.map((img, idx) => (
                                <button
                                    key={img}
                                    type="button"
                                    onClick={() => setSelectedImage(img)}
                                    className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden transition-opacity ${
                                        selectedImage === img ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                                    }`}
                                    aria-label={`Voir la photo ${idx + 1}`}
                                >
                                    <Image
                                        src={img}
                                        alt=""
                                        fill
                                        sizes="64px"
                                        className="object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return (
        <>
            <div className="flex flex-col gap-3">
                <Carousel className="w-full" setApi={setApi}>
                    <CarouselContent className="-ml-2 md:-ml-4">
                        {imageUrls.map((image, index) => (
                            <CarouselItem
                                key={image}
                                // Une photo par vue à toutes les tailles : la galerie d'une page
                                // détail vit dans une colonne de demi-largeur sur desktop, où
                                // `md:basis-1/2 lg:basis-1/3` réduisait la photo au sixième de la
                                // page. C'est la photo qui vend l'article, elle doit dominer.
                                className="pl-2 md:pl-4 basis-full"
                            >
                                <button
                                    type="button"
                                    onClick={() => openPreview(image)}
                                    className="relative block w-full aspect-[4/3] md:aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 cursor-zoom-in"
                                    aria-label={`Agrandir la photo ${index + 1}`}
                                >
                                    <Image
                                        src={image}
                                        alt={`Photo ${index + 1} de l'annonce`}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        // `contain` plutôt que `cover` : les photos sont prises au
                                        // téléphone dans des cadrages quelconques, un recadrage
                                        // automatique coupe régulièrement l'article lui-même.
                                        className="object-contain"
                                        priority={index === 0}
                                    />
                                </button>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {imageUrls.length > 1 && (
                        <>
                            <CarouselPrevious className="hidden md:flex left-2 h-9 w-9 bg-white/90 hover:bg-white border-none shadow-md" />
                            <CarouselNext className="hidden md:flex right-2 h-9 w-9 bg-white/90 hover:bg-white border-none shadow-md" />
                        </>
                    )}
                </Carousel>

                {/* Bande de miniatures : navigation directe quand il y a plusieurs photos. */}
                {imageUrls.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {imageUrls.map((image, index) => (
                            <button
                                key={image}
                                type="button"
                                onClick={() => api?.scrollTo(index)}
                                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-gray-100 transition-colors dark:bg-gray-800 md:h-20 md:w-20 ${
                                    currentSlide === index
                                        ? 'border-primary'
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                                aria-label={`Voir la photo ${index + 1}`}
                                aria-current={currentSlide === index}
                            >
                                <Image
                                    src={image}
                                    alt=""
                                    fill
                                    sizes="80px"
                                    className="object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Rendu hors de l'arbre de la page : à l'intérieur, un ancêtre créant un contexte
                d'empilement enfermait la lightbox sous la navbar desktop. */}
            {isMounted && lightbox ? createPortal(lightbox, document.body) : null}
        </>
    );
}
