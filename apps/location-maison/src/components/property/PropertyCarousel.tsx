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
          <div key={property.id} className="p-3">
            <div
              onClick={() => handleCardClick(property.id ?? '')}
              className="relative cursor-pointer rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:scale-[1.03] bg-white dark:bg-gray-800 hover:shadow-2xl flex flex-col group"
              style={{ height: "400px" }}
            >
              {/* Image principale */}
              <div className="relative w-full aspect-[3/2] bg-gray-200">
                <Image
                  src={property.images?.[0]?.fileURL || "/home.png"}
                  alt={property.title || "Image de la propriété"}
                  fill
                  className="object-cover"
                />
                {/* Type de propriété */}
                {property.typeProperty && (
                  <div className="absolute top-4 left-4 px-4 py-2 text-sm font-semibold bg-white/90 dark:bg-gray-800/90 text-[#146B67] dark:text-white rounded-full backdrop-blur-sm">
                    {TypeProperty[property.typeProperty]}
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-grow p-5">
                {/* Titre */}
                <div className="h-[60px]">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#146B67] transition-colors">
                    {property.title || "Propriété"}
                  </h3>
                </div>

                {/* Prix */}
                <div className="h-[30px]">
                  <p className="text-lg font-bold text-[#146B67] dark:text-blue-300">
                    {property.status === "FOR_RENT" ? "À louer" : "À vendre"} - {property.price.toLocaleString()} F CFA
                  </p>
                </div>

                {/* Adresse */}
                <div className="h-[25px]">
                  {property.street && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate italic">
                      {property.city}, {property.province}, {property.street}
                    </p>
                  )}
                </div>

                {/* Section d'icônes et chiffres */}
                <div className={`flex flex-wrap gap-4 mt-auto pt-3 text-gray-600 dark:text-gray-400 text-sm ${
                  (property.area > 0 || 
                   ("nbrRooms" in property && (property as any).nbrRooms > 0) || 
                   ("nbrBathrooms" in property && (property as any).nbrBathrooms > 0)) 
                  ? "border-t" : ""
                }`}>
                  {property.area > 0 && (
                    <div className="flex items-center gap-2 group-hover:text-[#146B67] transition-colors">
                      <MdOutlineSquareFoot className="w-5 h-5" />
                      <span>{property.area} m²</span>
                    </div>
                  )}

                  {(property.typeProperty === "Home" ||
                    property.typeProperty === "Villa" ||
                    property.typeProperty === "Apartment" ||
                    property.typeProperty === "Studio" ||
                    property.typeProperty === "Logement" ||
                    property.typeProperty === "Desk" ||
                    property.typeProperty === "Shop") && (
                      <>
                        {"nbrRooms" in property && (property as any).nbrRooms > 0 && (
                          <div className="flex items-center gap-2 group-hover:text-[#146B67] transition-colors">
                            <IoMdBed className="w-5 h-5" />
                            <span>{(property as any).nbrRooms}</span>
                          </div>
                        )}
                        {"nbrBathrooms" in property && (property as any).nbrBathrooms > 0 && (
                          <div className="flex items-center gap-2 group-hover:text-[#146B67] transition-colors">
                            <MdOutlineBathtub className="w-5 h-5" />
                            <span>{(property as any).nbrBathrooms}</span>
                          </div>
                        )}
                      </>
                    )}
                </div>
              </div>
            </div>
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
