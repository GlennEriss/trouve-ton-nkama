import { Image as ImageModel } from '@/models/annonce'
import React from 'react'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

type CarouselPropertyDetailsProps = {
  images: ImageModel[]
}
export const CarouselPropertyDetails: React.FC<CarouselPropertyDetailsProps> = ({ images }) => {
  const imageUrls = images.map(image => image.fileURL);

  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // state additionnel
  const [loadedImages, setLoadedImages] = React.useState<boolean[]>(Array(imageUrls.length).fill(false));

  const openPreview = (image: string) => {
    setSelectedImage(image);
    setIsPreviewOpen(true);
  };

  /* const closePreview = () => {
    setSelectedImage(null);
    setIsPreviewOpen(false);
  }; */

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  };

  //const selectedIndex = selectedImage ? imageUrls.indexOf(selectedImage) : -1;

  return (
    <>
      <Carousel>
        <CarouselContent className='relative'>
          {imageUrls.map((imageUrl, index) => (
            <CarouselItem className='md:basis-1/2 xl:basis-1/3' key={index}>
              <>
                {!loadedImages[index] && <Skeleton className="w-[500px] h-[400px]" />}
                <Image
                  src={imageUrl}
                  sizes="100vw"
                  alt="alt"
                  width={0}
                  height={0}
                  objectFit='cover'
                  quality={100}
                  priority
                  onClick={() => openPreview(imageUrl)}
                  onLoad={() => handleImageLoad(index)}
                  className={`w-[500px] h-[400px] cursor-pointer transition-transform duration-300 hover:scale-105 ${!loadedImages[index] ? 'hidden' : ''}`}
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
            <CarouselContent>
              {imageUrls.map((url, idx) => (
                <CarouselItem key={idx} className="flex justify-center items-center">
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
