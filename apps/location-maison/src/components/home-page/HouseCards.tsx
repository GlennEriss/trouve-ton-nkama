"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TypeProperty } from "@/lib/utils";

// Import des icônes
import { FaBath, FaToilet } from "react-icons/fa";
import { IoMdBed } from "react-icons/io";
import { MdOutlineSquareFoot } from "react-icons/md";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HouseCard = ({ house }: any) => {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/houseDetails?id=${house.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative cursor-pointer rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 bg-white dark:bg-gray-800 hover:shadow-2xl flex flex-col"
      style={{ height: "380px" }}
    >
      {/* Image principale */}
      <div className="relative w-full h-52 overflow-hidden">
        <Image
          src={house.images?.[0]?.fileURL || "/home.png"}
          alt={house.title || "Image de la propriété"}
          fill
          className="object-cover transform transition-transform duration-500 hover:scale-110"
        />
      </div>

      {/* Contenu de la carte */}
      <div className="p-4 bg-gradient-to-b from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 flex flex-col justify-between flex-grow">
        <div>
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 h-12">
            {house.title || "Propriété"}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {house.city}, {house.province}, {house.country}
          </p>
          {house.street && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {house.street}
            </p>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {house.status === "FOR_RENT" ? "À louer" : "À vendre"} - {house.price}{" "}
            F CFA
          </p>
        </div>

        {/* Section d'icônes et chiffres */}
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <IoMdBed className="w-5 h-5" />
            <span className="text-sm">{house.nbrRooms}</span>
          </div>
          <div className="flex items-center space-x-1">
            <FaToilet className="w-5 h-5" />
            <span className="text-sm">{house.nbrToilets}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MdOutlineSquareFoot className="w-5 h-5" />
            <span className="text-sm">{house.area} m²</span>
          </div>
        </div>
      </div>

      {/* Type de propriété */}
      {house.typeProperty && (
        <div className="absolute top-2 left-2 px-3 py-1 text-xs font-bold bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200 rounded-full">
          {TypeProperty[house.typeProperty]}
        </div>
      )}

      {/* Bouton "Voir les détails" */}
      <div className="absolute bottom-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-sm text-gray-500 dark:text-gray-300">
          Voir les détails
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 text-gray-600 dark:text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      </div>
    </div>
  );
};

export default HouseCard;
