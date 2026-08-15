"use client";

import React, { memo, useMemo, useCallback } from "react";
import Slider from "react-slick";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import PropertyCard from "../home-page/PropertyCard";
import { Property } from "@/models/annonce";
import { cn } from "@/lib/utils";

// Même largeur fixe que ListingCardsCarousel (2026-08-15, demande utilisateur explicite :
// une seule taille de card dans toute la plateforme) — plus de slidesToShow par breakpoint.
const CARD_WIDTH = 220;

interface CarouselProps {
  properties?: Property[]; // Optionnel maintenant
  isRecommendation?: boolean;
  hideDate?: boolean;
}

/* Flèche réutilisable (précédent / suivant) */
const ArrowButton: React.FC<{ direction: "prev" | "next"; onClick?: () => void }> = ({ direction, onClick }) => {
  const Icon = direction === "prev" ? FaArrowLeft : FaArrowRight;
  const position = direction === "prev" ? "left-0" : "right-0";
  return (
    <button
      aria-label={direction === "prev" ? "Précédent" : "Suivant"}
      onClick={onClick}
      className={`absolute ${position} top-1/2 -translate-y-1/2 z-10 group
                  border border-primary p-2 rounded-full shadow-lg
                  bg-white/80 hover:bg-primary transition-all duration-300
                  hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
    >
      <Icon className="w-5 h-5 text-primary-900 group-hover:text-white transition-colors duration-300" />
    </button>
  );
};

const PropertyCarousel: React.FC<CarouselProps> = ({ properties = [], isRecommendation = false, hideDate = false }) => {
  const router = useRouter();

  /* ----- Comptage & helpers ----- */
  const count = properties.length;
  const hasMultiple = count > 1;

  /* Navigation mémoïsée */
  const handleCardClick = useCallback(
    (id?: string) => {
      if (id) {
        router.push(`/annonce/${id}`);
      }
    },
    [router]
  );

  /* Paramètres du slider (uniquement si plusieurs propriétés) — largeur de card fixe
     (variableWidth), le nombre de cards visibles s'adapte à la largeur d'écran plutôt que
     l'inverse. */
  const settings = useMemo(
    () =>
      hasMultiple
        ? {
            dots: true,
            infinite: count > 4,
            speed: 500,
            slidesToShow: 1,
            variableWidth: true,
            slidesToScroll: 1,
            prevArrow: <ArrowButton direction="prev" />,
            nextArrow: <ArrowButton direction="next" />,
          }
        : undefined,
    [hasMultiple, count]
  );

  /* ----- Rendu ----- */
  return (
    <div className="container-page px-4 relative">
      {hasMultiple ? (
        <Slider {...settings}>
          {properties.map((p) => (
            <div
              key={p.id ?? `property-${Math.random()}`}
              className="p-3 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg transition-all duration-200"
              style={{ width: CARD_WIDTH }}
              onClick={() => handleCardClick(p.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(p.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Voir les détails de ${p.title}`}
            >
              <PropertyCard property={p} hideDate={hideDate} />
            </div>
          ))}
        </Slider>
      ) : (
        /* 1 seule carte : largeur contrôlée */
        properties[0] && (
          <div
            className="mx-auto block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg transition-all duration-200"
            style={{ width: CARD_WIDTH }}
            onClick={() => handleCardClick(properties[0].id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick(properties[0].id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Voir les détails de ${properties[0].title}`}
          >
            <PropertyCard property={properties[0]} hideDate={hideDate} />
          </div>
        )
      )}
      {/* Bouton « voir plus » toujours présent */}
      <div className={cn("mt-8 flex justify-center", isRecommendation ? 'hidden' : '')}>
        <button
          onClick={() => router.push("/search")}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary via-secondary to-primary hover:scale-[1.02] text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          Voir plus d'annonces
        </button>
      </div>
    </div>
  );
};

export default memo(PropertyCarousel);
