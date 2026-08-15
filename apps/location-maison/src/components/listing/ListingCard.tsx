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
import { ButtonFavoris } from "@/components/preview-property/ButtonFavoris";

/**
 * Densité d'affichage — voir docs/marketplace-multi-categories/01-direction-artistique.md.
 * "standard" reproduit exactement le rendu historique de PropertyCard (grilles immobilier
 * actuelles, zéro régression visuelle). "compact"/"showcase" ne sont consommées par aucune
 * grille en production pour l'instant (arrivent au Lot 5, accueil par catégories).
 */
export type ListingCardDensity = "showcase" | "standard" | "compact";

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

/**
 * Ligne de contexte sous le prix : pour l'immobilier (typeProperty présent), c'est le
 * même bloc chambres/sdb/surface qu'avant. Pour une catégorie sans typeProperty (mode,
 * etc.), c'est un résumé des attributs saisis (valeurs, sans libellé — le libellé
 * nécessiterait de connaître le schéma de la catégorie, hors scope de la carte ;
 * voir 01-direction-artistique.md § slot de contexte).
 */
function AttributeContextRow({ attributes }: { attributes: Record<string, unknown> }) {
  const values = Object.values(attributes)
    .filter((value) => value !== undefined && value !== null && value !== "")
    .slice(0, 3);

  if (values.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-auto pt-3 text-gray-600 dark:text-gray-400 text-sm border-t min-h-[40px] items-center">
      <span>{values.join(" · ")}</span>
    </div>
  );
}

const DENSITY_CLASSES: Record<
  ListingCardDensity,
  {
    minHeight: string;
    imageHeight: string;
    padding: string;
    titleSize: string;
    priceSize: string;
  }
> = {
  showcase: {
    minHeight: "min-h-[520px]",
    imageHeight: "h-[240px] sm:h-[250px] xl:h-[260px]",
    padding: "p-5",
    titleSize: "text-lg",
    priceSize: "text-lg",
  },
  standard: {
    minHeight: "min-h-[500px]",
    imageHeight: "h-[220px] sm:h-[230px] xl:h-[240px]",
    padding: "p-5",
    titleSize: "text-lg",
    priceSize: "text-lg",
  },
  compact: {
    minHeight: "min-h-[320px]",
    imageHeight: "h-[150px] sm:h-[160px]",
    padding: "p-3",
    titleSize: "text-sm",
    priceSize: "text-base",
  },
};

type ListingCardProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any;
  hideDate?: boolean;
  density?: ListingCardDensity;
};

const ListingCard = ({ property, hideDate = false, density = "standard" }: ListingCardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { trackEvent } = useTrackEvent();
  const propertyId = normalizePropertyId(property) || "unknown";
  const sizing = DENSITY_CLASSES[density];

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

    if (hitHasOwnerValue) {
      // La donnée est déjà fiable sur le hit (Firestore direct, ou Algolia une fois le
      // champ isOwner indexé — voir extensions/firestore-algolia-search.env) : on ne
      // fetch JAMAIS dans ce cas, que la valeur soit true ou false.
      directOwnerCache.set(propertyId, hitIsDirectOwner);
      setIsDirectOwner(hitIsDirectOwner);
      return;
    }

    if (!propertyId || propertyId === "unknown") {
      setIsDirectOwner(false);
      return;
    }

    const cachedValue = directOwnerCache.get(propertyId);
    if (cachedValue !== undefined) {
      setIsDirectOwner(cachedValue);
      return;
    }

    let isCancelled = false;

    // Filet de sécurité tant que isOwner n'est pas fiablement indexé partout (avant
    // déploiement de l'extension Algolia mise à jour + réindexation) : au pire un fetch
    // par annonce et par session, jamais par rendu.
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
      component: "ListingCard",
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

    router.push(`/annonce/${propertyId}`);
  };

  const categoryBadgeLabel = property.typeProperty
    ? TypeProperty[property.typeProperty]
    : typeof property.categoryPath?.lvl1 === "string"
      ? property.categoryPath.lvl1.split(" > ").pop()
      : undefined;

  const hasAttributes =
    !property.typeProperty &&
    property.attributes &&
    typeof property.attributes === "object" &&
    Object.keys(property.attributes).length > 0;

  // Densité "compact" (Mode, voir docs/marketplace-multi-categories/01-direction-artistique.md,
  // révisé 2026-08-15 sur demande utilisateur explicite) : layout dédié façon Le Bon Coin —
  // image carrée, coeur favori en overlay, prix en gras sous l'image, titre court, lieu + date
  // en petit texte gris. Volontairement SANS le bloc chambres/sdb/surface ni l'ombre/bordure
  // épaisse du gabarit immobilier, qui n'ont pas de sens pour un vêtement ou un accessoire.
  // "standard"/"showcase" (immobilier) restent strictement inchangés ci-dessous.
  if (density === "compact") {
    const locationLabel = [property.city, property.province].filter(Boolean).join(", ");
    return (
      <div
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className="relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        aria-label={`Voir les détails de ${property.title ?? "l'annonce"}`}
        role="button"
        tabIndex={0}
      >
        <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800">
          <Image
            src={resolvedImageSrc}
            alt={property.title ?? "Image de l'annonce"}
            fill
            sizes="(max-width: 640px) 50vw, 220px"
            className="object-cover"
            onError={(event) => {
              logImageError({
                component: "ListingCard",
                propertyId,
                title: property.title,
                rawFileUrl: rawPrimaryImageUrl,
                resolvedSrc:
                  event.currentTarget.currentSrc || event.currentTarget.src || resolvedImageSrc,
              });
              if (resolvedImageSrc !== "/home.png") {
                setResolvedImageSrc("/home.png");
              }
            }}
          />
          <ButtonFavoris
            idProperty={propertyId}
            size={20}
            source="listing_card"
            className="absolute right-2 top-2 z-10 bg-white/90 p-1.5 shadow-sm backdrop-blur-sm dark:bg-gray-900/80"
          />
          {categoryBadgeLabel && (
            <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 backdrop-blur-sm dark:bg-gray-900/80 dark:text-gray-200">
              {categoryBadgeLabel}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 p-2.5">
          <p className="text-base font-bold text-gray-900 dark:text-white">
            {property.price?.toLocaleString?.() ?? property.price} F CFA
          </p>
          <p className="line-clamp-2 min-h-[2.5rem] text-sm text-gray-700 dark:text-gray-300">
            {property.title ?? "Annonce"}
          </p>
          <p className="mt-auto truncate text-xs text-gray-400 dark:text-gray-500">
            {[locationLabel, !hideDate ? formatPublicationDate(property.createdAt) : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    );
  }

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
          `h-full ${sizing.minHeight} relative cursor-pointer rounded-2xl shadow-lg overflow-hidden transition-transform duration-200 ease-out hover:scale-[1.02] bg-white dark:bg-gray-800 hover:shadow-xl flex flex-col group will-change-transform w-full text-left border-none p-0`,
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
        <div className={cn("relative w-full bg-gray-200", sizing.imageHeight)}>
          <Image
            src={resolvedImageSrc}
            alt={property.title ?? "Image de l'annonce"}
            fill
            className="object-cover"
            onLoad={() =>
              logImageLoad({
                component: "ListingCard",
                propertyId,
                title: property.title,
                rawFileUrl: rawPrimaryImageUrl,
                resolvedSrc: resolvedImageSrc,
              })
            }
            onError={(event) => {
              logImageError({
                component: "ListingCard",
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
          {/* Catégorie / type de bien */}
          {categoryBadgeLabel && (
            <div className="absolute top-4 left-4 px-4 py-2 text-sm font-semibold bg-white/90 dark:bg-gray-800/90 text-primary dark:text-white rounded-full backdrop-blur-sm">
              {categoryBadgeLabel}
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

        <div className={cn("flex flex-col flex-1", sizing.padding)}>
          {/* Titre */}
          <div className="min-h-[68px]">
            <h3 className={cn(sizing.titleSize, "font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors")}>
              {property.title ?? "Annonce"}
            </h3>
          </div>

          {/* Prix */}
          <div className="min-h-[44px]">
            <p className={cn(sizing.priceSize, "pt-2 font-bold text-primary dark:text-blue-300 break-words")}>
              {property.status === "FOR_RENT" ? "À louer" : "À vendre"} - {property.price?.toLocaleString?.() ?? property.price} F CFA
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

          {/* Section d'icônes et chiffres (immobilier) OU résumé d'attributs (autres catégories) */}
          {hasAttributes ? (
            <AttributeContextRow attributes={property.attributes} />
          ) : (
            <div className={`flex flex-wrap gap-4 mt-auto pt-3 text-gray-600 dark:text-gray-400 text-sm min-h-[40px] ${(property.area > 0 ||
                ("nbrRooms" in property && property.nbrRooms > 0) ||
                ("nbrBathrooms" in property && property.nbrBathrooms > 0))
                ? "border-t" : ""
              }`}>
              {property.area > 0 && (
                <div className="flex items-center gap-2 group-hover:text-primary transition-colors">
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
                      <div className="flex items-center gap-2 group-hover:text-primary transition-colors">
                        <IoMdBed className="w-5 h-5" />
                        <span>{property.nbrRooms}</span>
                      </div>
                    )}
                    {"nbrBathrooms" in property && property.nbrBathrooms > 0 && (
                      <div className="flex items-center gap-2 group-hover:text-primary transition-colors">
                        <MdOutlineBathtub className="w-5 h-5" />
                        <span>{property.nbrBathrooms}</span>
                      </div>
                    )}
                  </>
                )}
            </div>
          )}

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

export default ListingCard;
