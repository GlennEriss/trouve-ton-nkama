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

interface CarouselProps {
  properties?: Property[]; // Optionnel maintenant
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
                  bg-white/80 hover:bg-[#146B67] transition-colors`}
    >
      <Icon className="w-5 h-5 text-[#0e4845] group-hover:text-white" />
    </button>
  );
};

const PropertyCarousel: React.FC<CarouselProps> = ({ properties = [] }) => {
  const router = useRouter();
  const { width } = useWindowSize();

  /* ----- Comptage & helpers ----- */
  const count       = properties.length;
  const hasMultiple = count > 1;

  /* centre-mode seulement sur desktop et ≤ 3 cartes */
  const isDesktop    = width >= 1024;
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
            centerMode:    shouldCenter,
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
                  centerMode:    false,
                },
              },
              { breakpoint: 1024, settings: { slidesToShow: Math.min(count, 2) } },
              { breakpoint: 640,  settings: { slidesToShow: 1 } },
            ],
          }
        : undefined,
    [hasMultiple, count, shouldCenter]
  );

  /* ----- Rendu ----- */
  return (
    <div className="container mx-auto px-4 md:py-12 relative">
      {hasMultiple ? (
        <Slider {...settings}>
          {properties.map((p) => (
            <div
              key={p.id || `property-${Math.random()}`}
              className="p-3"
              style={shouldCenter ? { width: 320 } : undefined}
              onClick={() => handleCardClick(p.id)}
            >
              <PropertyCard property={p} />
            </div>
          ))}
        </Slider>
      ) : (
        /* 1 seule carte : largeur contrôlée */
        properties[0] && (
          <div
            className="mx-auto"
            /* 100 % en mobile, 320 px max en desktop */
            style={{ width: "100%", maxWidth: 320 }}
            onClick={() => handleCardClick(properties[0].id)}
          >
            <PropertyCard property={properties[0]} />
          </div>
        )
      )}

      {/* Bouton « voir plus » toujours présent */}
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

export default memo(PropertyCarousel);
