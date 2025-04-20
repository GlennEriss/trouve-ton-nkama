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
    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-[#146B67] text-white p-2 rounded-full shadow-lg hover:bg-[#146B67]"
    onClick={onClick}
  >
    <FaArrowLeft className="w-5 h-5" />
  </button>
);

const CustomNextArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-[#146B67] text-white p-2 rounded-full shadow-lg hover:bg-[#146B67]"
    onClick={onClick}
  >
    <FaArrowRight className="w-5 h-5" />
  </button>
);

const PropertyCarousel: React.FC<CarouselProps> = ({ properties }) => {
  const router = useRouter();
  const fetchInfiniteProperties = async ({ pageParam }: { pageParam: any }) => {
    const { limitPerPage, lastDoc } = pageParam;
    return getProperties({
      limitPerPage,
      lastDoc,
    })
  }
  const { data, isPending, isFetching, fetchNextPage, error, isError } = useInfiniteQuery({
    queryKey: [queryKeys.propertie_carousel],
    queryFn: fetchInfiniteProperties,
    initialPageParam: { limitPerPage: PROPERTY_ITEM_PER_PAGE_CAROUSEL, lastDoc: null },
    getNextPageParam: (lastPage, allPages, pageParam) => {
      const { limitPerPage } = pageParam;
      const lastDoc = allPages[allPages.length - 1].lastDoc;
      return { limitPerPage, lastDoc };
    },
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
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
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
  if(!data){
    return null
  }
  return (
    <div className="container mx-auto px-4 py-8 relative">
      <Slider {...settings}>
        {data.pages[0]?.properties.map((property) => (
          <div key={property.id} className="p-2 rounded-lg">
            <div
              onClick={() => handleCardClick(property.id ?? '')}
              className="relative cursor-pointer rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 bg-white dark:bg-gray-800 hover:shadow-2xl flex flex-col"
              style={{ height: "380px" }}
            >
              {/* Image principale */}
              <div className="relative w-full h-52 overflow-hidden">
                <Image
                  src={property.images?.[0]?.fileURL || "/home.png"}
                  alt={property.title || "Image de la propriété"}
                  fill
                  className="object-cover transform transition-transform duration-500 hover:scale-110"
                />
              </div>

              <div className="mb-3 space-y-1 px-4 pt-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {property.title || "Propriété"}
                </h3>
                <p className="text-base font-bold text-[#146B67] dark:text-blue-300">
                  {property.status === "FOR_RENT" ? "À louer" : "À vendre"} - {property.price.toLocaleString()} F CFA
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {property.city}, {property.province}, {property.country}
                </p>
                {property.street && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate italic">
                    {property.street}
                  </p>
                )}
              </div>

              {/* Section d'icônes et chiffres */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-2 text-gray-600 dark:text-gray-400 text-sm">
                {property.area > 0 && (
                  <div className="flex items-center gap-1">
                    <MdOutlineSquareFoot className="w-4 h-4" />
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
                      <div className="flex items-center gap-1">
                        <IoMdBed className="w-4 h-4" />
                        <span>{(property as any).nbrRooms}</span>
                      </div>
                    )}
                    {"nbrToilets" in property && (property as any).nbrToilets > 0 && (
                      <div className="flex items-center gap-1">
                        <FaToilet className="w-4 h-4" />
                        <span>{(property as any).nbrToilets}</span>
                      </div>
                    )}
                    {"nbrBathrooms" in property && (property as any).nbrBathrooms > 0 && (
                      <div className="flex items-center gap-1">
                        <MdOutlineBathtub className="w-4 h-4" />
                        <span>{(property as any).nbrBathrooms}</span>
                      </div>
                    )}
                  </>
                )}

                {property.typeProperty === "Home" && "nbrFloors" in property && (property as any).nbrFloors > 0 && (
                  <div className="flex items-center gap-1">
                    <GiStairs className="w-4 h-4" />
                    <span>Étages : {(property as any).nbrFloors}</span>
                  </div>
                )}

                {property.typeProperty === "Villa" && (
                  <>
                    {"nbrFloors" in property && (property as any).nbrFloors > 0 && (
                      <div className="flex items-center gap-1">
                        <GiStairs className="w-4 h-4" />
                        <span>Étages : {(property as any).nbrFloors}</span>
                      </div>
                    )}
                    {"nbrGarages" in property && (property as any).nbrGarages > 0 && (
                      <div className="flex items-center gap-1">
                        <FaCar className="w-4 h-4" />
                        <span>Garage : {(property as any).nbrGarages}</span>
                      </div>
                    )}
                    {"nbrPiscine" in property && (property as any).nbrPiscine > 0 && (
                      <div className="flex items-center gap-1">
                        <MdPool className="w-4 h-4" />
                        <span>Piscine : {(property as any).nbrPiscine}</span>
                      </div>
                    )}
                  </>
                )}

                {property.typeProperty === "Building" && (
                  <>
                    {"nbrApartments" in property && (property as any).nbrApartments > 0 && (
                      <div className="flex items-center gap-1">
                        <PiBuildings className="w-4 h-4" />
                        <span>Appartements : {(property as any).nbrApartments}</span>
                      </div>
                    )}
                    {"nbrFloors" in property && (property as any).nbrFloors > 0 && (
                      <div className="flex items-center gap-1">
                        <GiStairs className="w-4 h-4" />
                        <span>Étages : {(property as any).nbrFloors}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* Type de propriété */}
              {property.typeProperty && (
                <div className="absolute top-2 left-2 px-3 py-1 text-xs font-bold bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200 rounded-full">
                  {TypeProperty[property.typeProperty]}
                </div>
              )}
            </div>
          </div>
        ))}
      </Slider>
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => router.push("/search")}
          className="px-6 py-2 rounded-full bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] hover:brightness-110 text-white font-semibold transition duration-300 shadow-md"
        >
          Voir plus
        </button>
      </div>
    </div>
  );
};

export default PropertyCarousel;
