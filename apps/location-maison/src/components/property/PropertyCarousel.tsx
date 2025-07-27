"use client";

import React, { memo, useMemo, useCallback } from "react";
import Slider from "react-slick";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import PropertyCard from "../home-page/PropertyCard";
import { useWindowSize } from "@/hooks/useSize";
import { Property } from "@/models/annonce";
import { cn } from "@/lib/utils";

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
                  border border-[#146B67] p-2 rounded-full shadow-lg
                  bg-white/80 hover:bg-[#146B67] transition-all duration-300
                  hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#146B67] focus:ring-offset-2`}
    >
      <Icon className="w-5 h-5 text-[#0e4845] group-hover:text-white transition-colors duration-300" />
    </button>
  );
};

const PropertyCarousel: React.FC<CarouselProps> = ({ properties = [], isRecommendation = false, hideDate = false }) => {
  const router = useRouter();
  const { width } = useWindowSize();

  /* ----- Comptage & helpers ----- */
  const count = properties.length;
  const hasMultiple = count > 1;

  /* centre-mode seulement sur desktop et ≤ 3 cartes */
  const isDesktop = width >= 1024;
  const shouldCenter = isDesktop && count <= 3;

  /* Navigation mémoïsée */
  const handleCardClick = useCallback(
    (id?: string) => {
      if (id) {
        router.push(`/houseDetails/${id}`);
      }
    },
    [router]
  );

  /* Paramètres du slider (uniquement si plusieurs propriétés) */
  const settings = useMemo(
    () =>
      hasMultiple
        ? {
            dots: true,
            infinite: count > 4,
            speed: 500,
            slidesToShow: Math.min(count, 4),
            variableWidth: shouldCenter,
            centerMode: shouldCenter,
            centerPadding: shouldCenter ? "40px" : "0px",
            slidesToScroll: 1,
            prevArrow: <ArrowButton direction="prev" />,
            nextArrow: <ArrowButton direction="next" />,
            responsive: [
              {
                breakpoint: 1280,
                settings: {
                  slidesToShow: Math.min(count, 3),
                  variableWidth: false,
                  centerMode: false,
                },
              },
              { breakpoint: 1024, settings: { slidesToShow: Math.min(count, 3) } },
              { breakpoint: 912, settings: { slidesToShow: Math.min(count, 3) } },
              { breakpoint: 820, settings: { slidesToShow: Math.min(count, 2) } },
              { breakpoint: 540, settings: { slidesToShow: Math.min(count, 2) } },
              { breakpoint: 539, settings: { slidesToShow: 1 } },
            ],
          }
        : undefined,
    [hasMultiple, count, shouldCenter]
  );

  /* ----- Rendu ----- */
  return (
    <div className="container mx-auto px-4 relative max-w-[1280px] 2xl:max-w-[1440px]">
      {hasMultiple ? (
        <Slider {...settings}>
          {properties.map((p) => (
            <div
              key={p.id ?? `property-${Math.random()}`}
              className="p-3 w-full text-left focus:outline-none focus:ring-2 focus:ring-[#146B67] focus:ring-offset-2 rounded-lg transition-all duration-200"
              style={shouldCenter ? { width: 320 } : undefined}
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
            className="mx-auto block focus:outline-none focus:ring-2 focus:ring-[#146B67] focus:ring-offset-2 rounded-lg transition-all duration-200"
            style={{ width: '100%', maxWidth: 320 }}
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
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] hover:scale-[1.02] text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          Voir plus d'annonces
        </button>
      </div>
    </div>
  );
};

export default memo(PropertyCarousel);
