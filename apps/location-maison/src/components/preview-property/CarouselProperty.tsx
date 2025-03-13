import React from 'react'
import Image from 'next/image'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '../ui/carousel'

export default function CarouselProperty({ images }: { images: string[] }) {
    return (
        <Carousel>
            <CarouselContent className='relative'>
                {
                    images.map((image, index) => (
                        <CarouselItem className='md:basis-1/2 xl:basis-1/3' key={index}>
                            <Image
                                src={image}
                                sizes="100vw"
                                alt="alt"
                                width={0}
                                height={0}
                                objectFit='fill'
                                quality={100}
                                priority
                                className='w-[500px] h-[400px]'
                            />
                        </CarouselItem>
                    ))
                }
            </CarouselContent>
            <CarouselPrevious
                className="left-0 top-1/2 transform -translate-y-1/2 bg-gray-500 text-white px-3 py-2 rounded-none h-10 w-10"
            />
            <CarouselNext
                className="right-0 top-1/2 transform -translate-y-1/2 bg-gray-500 text-white px-3 py-2 rounded-none h-10 w-10"
            />
        </Carousel>

    )
}
