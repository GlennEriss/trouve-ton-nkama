"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { formatPublicationDate } from "@/lib/utils";
import { TypeProperty } from "@/constantes/property-type";
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';

// Import des icônes
import { IoMdBed } from "react-icons/io";
import { MdOutlineBathtub, MdOutlineSquareFoot } from "react-icons/md";
import { CheckCircle } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PropertyCard = ({ property, hideDate = false }: { property: any; hideDate?: boolean }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { trackEvent } = useTrackEvent();

  const handleCardClick = () => {
    const propertyId = property.objectID || property.id || property.path;
    trackEvent(trackingEvents.CTA_PROPERTY_CARD_CLICK, {
      source: pathname ?? 'unknown',
      property_id: propertyId ?? '',
      property_type: property.typeProperty ?? '',
      property_status: property.status ?? '',
    });

    if (property.path) {
      router.push(`/houseDetails/${property.path.replace("properties/", "")}`);
    } else {
      // Fallback si path n'existe pas, utiliser objectID ou id
      router.push(`/houseDetails/${propertyId}`);
    }
  };

  return (
    <div key={property.id} className="">
      <div
        onClick={() => handleCardClick()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className="h-full min-h-[500px] relative cursor-pointer rounded-2xl shadow-lg overflow-hidden transition-transform duration-200 ease-out hover:scale-[1.02] bg-white dark:bg-gray-800 hover:shadow-xl flex flex-col group will-change-transform w-full text-left border-none p-0"
        aria-label={`Voir les détails de ${property.title ?? "l'annonce"}`}
        role="button"
        tabIndex={0}
      >
        {/* Image principale */}
        <div className="relative w-full h-[220px] sm:h-[230px] xl:h-[240px] bg-gray-200">
          <Image
            src={property.images?.[0]?.fileURL ?? "/home.png"}
            alt={property.title ?? "Image de l'annonce"}
            fill
            className="object-cover"
          />
          {/* Type de propriété */}
          {property.typeProperty && (
            <div className="absolute top-4 left-4 px-4 py-2 text-sm font-semibold bg-white/90 dark:bg-gray-800/90 text-[#146B67] dark:text-white rounded-full backdrop-blur-sm">
              {TypeProperty[property.typeProperty]}
            </div>
          )}
          
          {/* Indicateur de vérification du numéro de téléphone */}
          {property.createdBy && property.createdBy.phoneNumberVerified && (
            <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full backdrop-blur-sm border border-green-200 dark:border-green-700">
              <CheckCircle className="w-3 h-3" />
              <span>Numéro vérifié</span>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 p-5">
          {/* Titre */}
          <div className="min-h-[68px]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#146B67] transition-colors">
              {property.title ?? "Annonce"}
            </h3>
          </div>

          {/* Prix */}
          <div className="min-h-[44px]">
            <p className="text-lg pt-2 font-bold text-[#146B67] dark:text-blue-300 break-words">
              {property.status === "FOR_RENT" ? "À louer" : "À vendre"} - {property.price.toLocaleString()} F CFA
            </p>
          </div>

          {/* Adresse */}
          <div className="min-h-[50px]">
            {property.street && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic break-words line-clamp-2">
                {property.city}, {property.province}, {property.street}
              </p>
            )}
          </div>

          {/* Section d'icônes et chiffres */}
          <div className={`flex flex-wrap gap-4 mt-auto pt-3 text-gray-600 dark:text-gray-400 text-sm min-h-[40px] ${(property.area > 0 ||
              ("nbrRooms" in property && property.nbrRooms > 0) ||
              ("nbrBathrooms" in property && property.nbrBathrooms > 0))
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
                  {"nbrRooms" in property && property.nbrRooms > 0 && (
                    <div className="flex items-center gap-2 group-hover:text-[#146B67] transition-colors">
                      <IoMdBed className="w-5 h-5" />
                      <span>{property.nbrRooms}</span>
                    </div>
                  )}
                  {"nbrBathrooms" in property && property.nbrBathrooms > 0 && (
                    <div className="flex items-center gap-2 group-hover:text-[#146B67] transition-colors">
                      <MdOutlineBathtub className="w-5 h-5" />
                      <span>{property.nbrBathrooms}</span>
                    </div>
                  )}
                </>
              )}
          </div>

          {/* Date de publication */}
          {!hideDate && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 min-h-[36px]">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-5">
                Publiée {formatPublicationDate(property.createdAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
