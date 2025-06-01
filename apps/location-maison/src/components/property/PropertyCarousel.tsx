"use client";

import React from "react";
import Slider from "react-slick";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaArrowRight, FaToilet, FaCar } from "react-icons/fa";
import { IoMdBed } from "react-icons/io";
import { MdOutlineSquareFoot, MdOutlineBathtub, MdPool } from "react-icons/md";
import { GiStairs } from "react-icons/gi";
import { PiBuildings } from "react-icons/pi";
import { TypeProperty } from "@/lib/utils";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { getProperties } from "@/db/property.db";
import queryKeys from "@/constantes/react-query-keys";
import { PROPERTY_ITEM_PER_PAGE_CAROUSEL } from "@/constantes/item-per-page";
import { useInfiniteQuery } from "@tanstack/react-query";
import PropertyCard from "../home-page/PropertyCard";

interface Property {
  id: number | string;
  title: string;
  images: { fileURL: string }[];
  city: string;
  province: string;
  country: string;
  street?: string;
  status: string;
  price: string;
  nbrRooms?: number;
  nbrToilets?: number;
  nbrBathrooms?: number;
  nbrGarages?: number;
  nbrFloors?: number;
  nbrPiscine?: number;
  area: number;
  typeProperty: string;
  description: string; // Ajout de la description
}

interface CarouselProps {
  properties: Property[];
}

// Flèches personnalisées
const CustomPrevArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 group hover:text-white border border-[#146B67] text-white p-2 rounded-full shadow-lg hover:bg-[#146B67]"
    onClick={onClick}
  >
    <FaArrowLeft className="w-5 h-5 text-[#0e4845] group-hover:text-white" />
  </button>
);

const CustomNextArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 group hover:text-white border border-[#146B67] text-white p-2 rounded-full shadow-lg hover:bg-[#146B67]"
    onClick={onClick}
  >
    <FaArrowRight className="w-5 h-5 text-[#0e4845] group-hover:text-white" />
  </button>
);

const PropertyCarousel: React.FC<CarouselProps> = ({ properties }) => {
  const router = useRouter();
  const fetchInfiniteProperties = async ({ pageParam }: { pageParam: any }) => {
    const { limitPerPage, lastDoc } = pageParam;
    const url = `/api/property/list?limit=${limitPerPage}&lastDoc=${lastDoc || ''}`;
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch properties");
    }
    const data = await response.json();
    return data;
  };
  const { data, isPending, isFetching, fetchNextPage, error, isError } = useInfiniteQuery({
    queryKey: [queryKeys.propertie_carousel],
    queryFn: fetchInfiniteProperties,
    initialPageParam: { limitPerPage: PROPERTY_ITEM_PER_PAGE_CAROUSEL, lastDoc: null },
    getNextPageParam: (lastPage, allPages, pageParam) => {
      const { limitPerPage } = pageParam;
      const lastDoc = allPages[allPages.length - 1]?.lastDoc || null;
      return { limitPerPage, lastDoc };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
  })
  const handleCardClick = (id: number | string) => {
    router.push(`/houseDetails/${id}`);
  };

  // Configuration du carousel
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 375,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };
  /* if(isError){
    return (
      <div>
        {error.message}
      </div>
    )
  } */
  if (!data) {
    return null
  }
  return (
    <div className="container mx-auto px-4 md:py-12 relative">
      <Slider {...settings}>
        {data.pages[0]?.properties.map((property: Property) => (
          <div key={property.id} className="p-3" onClick={() => handleCardClick(property.id)}>
            <PropertyCard property={property} />
          </div>
        ))}
      </Slider>
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => router.push("/search")}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] hover:scale-[1.02] text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          Voir plus d'annonces
        </button>
      </div>
    </div>
  );
};

export default PropertyCarousel;
