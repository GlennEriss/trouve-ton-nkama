"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn, formatPublicationDate } from "@/lib/utils";
import { TypeProperty } from "@/constantes/property-type";
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';
import { logImageError, logImageFallback, logImageLoad } from "@/lib/image-debug";
import { resolveThumbnailUrl } from "@/lib/property-images";

// Import des icônes
import { IoMdBed } from "react-icons/io";
import { MdOutlineBathtub, MdOutlineSquareFoot } from "react-icons/md";
import { CheckCircle, KeyRound } from "lucide-react";

const directOwnerCache = new Map<string, boolean>();

function normalizePropertyId(property: any): string {
  const rawId = property.objectID || property.id || property.path || "";

  return String(rawId).replace(/^properties\//, "");
}

function isDirectOwnerValue(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PropertyCard = ({ property, hideDate = false }: { property: any; hideDate?: boolean }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { trackEvent } = useTrackEvent();
  const propertyId = normalizePropertyId(property) || "unknown";
  const firstImageCandidate = Array.isArray(property.images)
    ? property.images.find((image: unknown) => {
        if (typeof image === "string") {
          return image.trim().length > 0;
        }
        if (!image || typeof image !== "object") {
          return false;
        }
        const fileURL = (image as { fileURL?: unknown }).fileURL;
        return typeof fileURL === "string" && fileURL.trim().length > 0;
      })
    : null;
  const rawPrimaryImageUrl = resolveThumbnailUrl(
    firstImageCandidate as { fileURL?: string; thumbURL?: string } | string | null | undefined
  );
  const hasPrimaryImageUrl =
    typeof rawPrimaryImageUrl === "string" && rawPrimaryImageUrl.trim().length > 0;
  const primaryImageSrc = hasPrimaryImageUrl ? rawPrimaryImageUrl : "/home.png";
  const [resolvedImageSrc, setResolvedImageSrc] = React.useState(primaryImageSrc);
  const [isDirectOwner, setIsDirectOwner] = React.useState(() =>
    isDirectOwnerValue(property.isOwner) || directOwnerCache.get(propertyId) === true
  );

  React.useEffect(() => {
    setResolvedImageSrc(primaryImageSrc);
  }, [primaryImageSrc]);

  React.useEffect(() => {
    const hitIsDirectOwner = isDirectOwnerValue(property.isOwner);
    const hitHasOwnerValue = property.isOwner !== undefined && property.isOwner !== null;

    if (hitIsDirectOwner) {
      directOwnerCache.set(propertyId, true);
      setIsDirectOwner(true);
      return;
    }

    if (!propertyId || propertyId === "unknown") {
      setIsDirectOwner(false);
      return;
    }

    const cachedValue = directOwnerCache.get(propertyId);
    if (cachedValue === true || (cachedValue === false && !hitHasOwnerValue)) {
      setIsDirectOwner(cachedValue);
      return;
    }

    let isCancelled = false;

    fetch(`/api/property/id?id=${encodeURIComponent(propertyId)}`)
      .then((response) => {
        if (!response.ok) {
          return null;
        }

        return response.json();
      })
      .then((freshProperty) => {
        if (isCancelled) {
          return;
        }

        const nextIsDirectOwner = isDirectOwnerValue(freshProperty?.isOwner);
        directOwnerCache.set(propertyId, nextIsDirectOwner);
        setIsDirectOwner(nextIsDirectOwner);
      })
      .catch(() => {
        if (!isCancelled) {
          directOwnerCache.set(propertyId, false);
          setIsDirectOwner(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [property.isOwner, propertyId]);

  React.useEffect(() => {
    if (hasPrimaryImageUrl) {
      return;
    }
    logImageFallback({
      component: "PropertyCard",
      propertyId,
      title: property.title,
      rawFileUrl: rawPrimaryImageUrl,
      resolvedSrc: primaryImageSrc,
    });
  }, [hasPrimaryImageUrl, primaryImageSrc, property.title, propertyId, rawPrimaryImageUrl]);

  const handleCardClick = () => {
    trackEvent(trackingEvents.CTA_PROPERTY_CARD_CLICK, {
      source: pathname ?? 'unknown',
      property_id: propertyId ?? '',
      property_type: property.typeProperty ?? '',
      property_status: property.status ?? '',
    });

    router.push(`/houseDetails/${propertyId}`);
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
        className={cn(
          "h-full min-h-[500px] relative cursor-pointer rounded-2xl shadow-lg overflow-hidden transition-transform duration-200 ease-out hover:scale-[1.02] bg-white dark:bg-gray-800 hover:shadow-xl flex flex-col group will-change-transform w-full text-left border-none p-0",
          isDirectOwner &&
            "ring-2 ring-amber-400/90 shadow-[0_18px_45px_rgba(245,158,11,0.26)] hover:shadow-[0_22px_55px_rgba(245,158,11,0.34)]"
        )}
        aria-label={`Voir les détails de ${property.title ?? "l'annonce"}`}
        role="button"
        tabIndex={0}
      >
        {isDirectOwner && (
          <>
            <div
              className="pointer-events-none absolute inset-0 z-20 rounded-2xl border border-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute left-4 right-4 top-0 z-20 h-1 rounded-b-full bg-gradient-to-r from-transparent via-amber-200 to-transparent"
              aria-hidden="true"
            />
          </>
        )}

        {/* Image principale */}
        <div className="relative w-full h-[220px] sm:h-[230px] xl:h-[240px] bg-gray-200">
          <Image
            src={resolvedImageSrc}
            alt={property.title ?? "Image de l'annonce"}
            fill
            className="object-cover"
            onLoad={() =>
              logImageLoad({
                component: "PropertyCard",
                propertyId,
                title: property.title,
                rawFileUrl: rawPrimaryImageUrl,
                resolvedSrc: resolvedImageSrc,
              })
            }
            onError={(event) => {
              logImageError({
                component: "PropertyCard",
                propertyId,
                title: property.title,
                rawFileUrl: rawPrimaryImageUrl,
                resolvedSrc:
                  event.currentTarget.currentSrc ||
                  event.currentTarget.src ||
                  resolvedImageSrc,
              });

              if (resolvedImageSrc !== "/home.png") {
                setResolvedImageSrc("/home.png");
              }
            }}
          />
          {/* Type de propriété */}
          {property.typeProperty && (
            <div className="absolute top-4 left-4 px-4 py-2 text-sm font-semibold bg-white/90 dark:bg-gray-800/90 text-[#146B67] dark:text-white rounded-full backdrop-blur-sm">
              {TypeProperty[property.typeProperty]}
            </div>
          )}
          
          {/* Badges droite : propriétaire direct + numéro vérifié */}
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
            {isDirectOwner && (
              <div className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-amber-400 text-amber-950 rounded-full shadow-sm ring-1 ring-white/80">
                <KeyRound className="w-3 h-3" />
                <span>Propriétaire direct</span>
              </div>
            )}
            {property.createdBy && property.createdBy.phoneNumberVerified && (
              <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full backdrop-blur-sm border border-green-200 dark:border-green-700">
                <CheckCircle className="w-3 h-3" />
                <span>Numéro vérifié</span>
              </div>
            )}
          </div>
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
