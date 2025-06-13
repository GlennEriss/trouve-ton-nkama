"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDateFr } from "@/lib/utils";
import { TypeProperty } from "@/constantes/property-type";

// Import des icônes
import { FaToilet } from "react-icons/fa";
import { IoMdBed } from "react-icons/io";
import { MdOutlineBathtub, MdOutlineSquareFoot } from "react-icons/md";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PropertyCard = ({ property }: any) => {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/houseDetails/${property.path.replace("properties/", "")}`);
  };

  return (
    <div key={property.id} className="">
      <div
        onClick={() => handleCardClick()}
        className="h-[460px] md:h-[450px] relative cursor-pointer rounded-2xl shadow-lg overflow-hidden transition-transform duration-200 ease-out hover:scale-[1.02] bg-white dark:bg-gray-800 hover:shadow-xl flex flex-col group will-change-transform"
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
          <div className="h-[48px]">
            <p className="text-lg font-bold text-[#146B67] dark:text-blue-300">
              {property.status === "FOR_RENT" ? "À louer" : "À vendre"} - {property.price.toLocaleString()} F CFA
            </p>
          </div>

          {/* Adresse */}
          <div className="h-[30px]">
            {property.street && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate italic">
                {property.city}, {property.province}, {property.street}
              </p>
            )}
          </div>

          {/* Section d'icônes et chiffres */}
          <div className={`flex flex-wrap gap-4 mt-auto pt-3 text-gray-600 dark:text-gray-400 text-sm ${(property.area > 0 ||
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
  );
};

export default PropertyCard;
