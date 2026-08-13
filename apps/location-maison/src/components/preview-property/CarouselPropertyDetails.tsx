'use client'

import { Image as ImageModel } from '@/models/annonce'
import React from 'react'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@trouve-ton-nkama/ui/carousel'
import Image from 'next/image'
import { Skeleton } from '@trouve-ton-nkama/ui/skeleton';
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import { getPropertyImageUrls } from '@/lib/property-images';
import { useSwipeable } from 'react-swipeable';

type CarouselPropertyDetailsProps = {
  images?: ImageModel[] | null
}
export const CarouselPropertyDetails: React.FC<CarouselPropertyDetailsProps> = ({ images }) => {
  const imageUrls = getPropertyImageUrls(images);

  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);

  // state additionnel
  const [loadedImages, setLoadedImages] = React.useState<boolean[]>(Array(imageUrls.length).fill(false));

  React.useEffect(() => {
    setLoadedImages(Array(imageUrls.length).fill(false));
  }, [imageUrls.length]);

  React.useEffect(() => {
    if (selectedImageIndex === null) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedImageIndex]);

  const openPreview = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closePreview = () => {
    setSelectedImageIndex(null);
  };

  const goToNextImage = React.useCallback(() => {
    setSelectedImageIndex((currentIndex) => {
      if (currentIndex === null || imageUrls.length === 0) return currentIndex;
      return (currentIndex + 1) % imageUrls.length;
    });
  }, [imageUrls.length]);

  const goToPreviousImage = React.useCallback(() => {
    setSelectedImageIndex((currentIndex) => {
      if (currentIndex === null || imageUrls.length === 0) return currentIndex;
      return (currentIndex - 1 + imageUrls.length) % imageUrls.length;
    });
  }, [imageUrls.length]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNextImage,
    onSwipedRight: goToPreviousImage,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedImageIndex === null) return;

      if (event.key === 'Escape') {
        closePreview();
      }

      if (event.key === 'ArrowRight') {
        goToNextImage();
      }

      if (event.key === 'ArrowLeft') {
        goToPreviousImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextImage, goToPreviousImage, selectedImageIndex]);

  const selectedImageUrl =
    selectedImageIndex !== null ? imageUrls[selectedImageIndex] : null;

  const hasMultipleImages = imageUrls.length > 1;

  const handlePreviewBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closePreview();
    }
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  };

  if (imageUrls.length === 0) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-b-3xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
        <div className="flex flex-col items-center gap-2 text-center">
          <ImageOff className="h-10 w-10" />
          <span className="text-sm font-medium">Aucune photo disponible</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Carousel>
        <CarouselContent className='relative ml-0'>
          {imageUrls.map((imageUrl, index) => (
            <CarouselItem className='pl-0' key={imageUrl}>
              <>
                {!loadedImages[index] && <Skeleton className="w-full h-[400px]" />}
                <Image
                  src={imageUrl}
                  sizes="100vw"
                  alt="alt"
                  width={0}
                  height={0}
                  quality={100}
                  priority
                  onClick={() => openPreview(index)}
                  onLoad={() => handleImageLoad(index)}
                  className={`w-full h-[400px] object-cover cursor-pointer transition-transform duration-300 hover:scale-105 ${!loadedImages[index] ? 'hidden' : ''}`}
                />
              </>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-0 top-1/2 rounded-full transform -translate-y-1/2 text-gray-500 bg-white px-3 py-2 h-10 w-10" />
        <CarouselNext className="right-0 rounded-full top-1/2 transform -translate-y-1/2 text-gray-500 bg-white px-3 py-2 h-10 w-10" />
      </Carousel>

      {selectedImageUrl && selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-[2147483647] flex h-dvh w-screen items-center justify-center overflow-hidden bg-black text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu des photos de l'annonce"
          onClick={handlePreviewBackdropClick}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-black via-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-black via-black/70 to-transparent" />

          <div
            className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-md">
              {selectedImageIndex + 1} / {imageUrls.length}
            </div>
            <button
              type="button"
              onClick={closePreview}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-md transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Fermer l'aperçu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={goToPreviousImage}
                className="absolute left-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/15 text-white shadow-lg backdrop-blur-md transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white md:left-6"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={goToNextImage}
                className="absolute right-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/15 text-white shadow-lg backdrop-blur-md transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white md:right-6"
                aria-label="Photo suivante"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          <div
            className="relative z-10 flex h-full w-full items-center justify-center px-2 py-20 sm:px-6 md:px-20"
            {...swipeHandlers}
          >
            <div className="relative h-full max-h-full w-full">
              {!loadedImages[selectedImageIndex] && (
                <Skeleton className="absolute inset-0 h-full w-full bg-white/10" />
              )}
              <Image
                src={selectedImageUrl}
                alt={`Photo ${selectedImageIndex + 1} sur ${imageUrls.length}`}
                fill
                sizes="100vw"
                quality={100}
                priority
                onLoad={() => handleImageLoad(selectedImageIndex)}
                className={`object-contain transition-opacity duration-200 ${
                  loadedImages[selectedImageIndex] ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          </div>

          {hasMultipleImages && (
            <div
              className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <div className="mx-auto flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-full bg-white/10 px-3 py-2 backdrop-blur-md md:rounded-2xl">
                {imageUrls.map((url, index) => (
                  <button
                    type="button"
                    key={url}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-2.5 rounded-full transition-all md:relative md:h-14 md:w-14 md:overflow-hidden md:rounded-xl ${
                      selectedImageIndex === index
                        ? 'w-8 bg-white md:w-14 md:ring-2 md:ring-white'
                        : 'w-2.5 bg-white/45 hover:bg-white/80'
                    }`}
                    aria-label={`Afficher la photo ${index + 1}`}
                  >
                    <span className="sr-only">Photo {index + 1}</span>
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="56px"
                      className="hidden object-cover md:block"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
