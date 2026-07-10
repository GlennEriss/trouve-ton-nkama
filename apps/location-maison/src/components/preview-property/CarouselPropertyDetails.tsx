import { Image as ImageModel } from '@/models/annonce'
import React from 'react'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';
import { getPropertyImageUrls } from '@/lib/property-images';

type CarouselPropertyDetailsProps = {
  images?: ImageModel[] | null
}
export const CarouselPropertyDetails: React.FC<CarouselPropertyDetailsProps> = ({ images }) => {
  const imageUrls = getPropertyImageUrls(images);

  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // state additionnel
  const [loadedImages, setLoadedImages] = React.useState<boolean[]>(Array(imageUrls.length).fill(false));

  const openPreview = () => {
    setIsPreviewOpen(true);
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
                  onClick={() => openPreview()}
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

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl w-full flex flex-col items-center justify-center p-0">
          <Carousel>
            <CarouselContent className='ml-0'>
              {imageUrls.map((url, idx) => (
                <CarouselItem key={url} className="flex justify-center items-center pl-0">
                  <>
                    {!loadedImages[idx] && <Skeleton className="w-full h-[400px] md:h-[768px]" />}
                    <Image
                      src={url}
                      alt={`Image ${idx + 1}`}
                      width={1200}
                      height={800}
                      objectFit="contain"
                      onLoad={() => handleImageLoad(idx)}
                      className={`w-full h-[400px] md:h-[768px] ${!loadedImages[idx] ? 'hidden' : ''}`}
                    />
                  </>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 top-1/2 transform -translate-y-1/2 text-gray-500 bg-white px-3 py-2 h-10 w-10 rounded-full" />
            <CarouselNext className="right-0 top-1/2 transform -translate-y-1/2 text-gray-500 bg-white px-3 py-2 h-10 w-10 rounded-full" />
          </Carousel>
        </DialogContent>
      </Dialog>
    </>
  );
}
