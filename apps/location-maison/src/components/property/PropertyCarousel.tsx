"use client";

import React from "react";
import Slider from "react-slick";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { IoMdBed } from "react-icons/io";
import { FaToilet } from "react-icons/fa";
import { MdOutlineSquareFoot } from "react-icons/md";
import { TypeProperty } from "@/lib/utils";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface Property {
  id: number;
  title: string;
  images: { fileURL: string }[];
  city: string;
  province: string;
  country: string;
  street?: string;
  status: string;
  price: string;
  nbrRooms: number;
  nbrToilets: number;
  area: number;
  typeProperty: string;
}

interface CarouselProps {
  properties: Property[];
}

// Flèches personnalisées
const CustomPrevArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600"
    onClick={onClick}
  >
    <FaArrowLeft className="w-5 h-5" />
  </button>
);

const CustomNextArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600"
    onClick={onClick}
  >
    <FaArrowRight className="w-5 h-5" />
  </button>
);

const PropertyCarousel: React.FC<CarouselProps> = ({ properties }) => {
  const router = useRouter();

  const handleCardClick = (id: number) => {
    router.push(`/houseDetails?id=${id}`);
  };

  // Configuration du carousel
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
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

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <Slider {...settings}>
        {properties.map((property) => (
          <div key={property.id} className="p-2 rounded-lg">
            <div
              onClick={() => handleCardClick(property.id)}
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

              {/* Contenu de la carte */}
              <div className="p-4 bg-gradient-to-b from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 h-12">
                    {property.title || "Propriété"}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {property.city}, {property.province}, {property.country}
                  </p>
                  {property.street && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {property.street}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {property.status === "FOR_RENT" ? "À louer" : "À vendre"} -{" "}
                    {property.price} F CFA
                  </p>
                </div>

                {/* Section d'icônes et chiffres */}
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <IoMdBed className="w-5 h-5" />
                    <span className="text-sm">{property.nbrRooms}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FaToilet className="w-5 h-5" />
                    <span className="text-sm">{property.nbrToilets}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MdOutlineSquareFoot className="w-5 h-5" />
                    <span className="text-sm">{property.area} m²</span>
                  </div>
                </div>
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
    </div>
  );
};

export default PropertyCarousel;
