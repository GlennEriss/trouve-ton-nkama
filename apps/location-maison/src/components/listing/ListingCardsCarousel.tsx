"use client";

import React, { useMemo } from "react";
import Slider from "react-slick";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import ListingCard from "./ListingCard";

// Même largeur que la rangée à défilement horizontal manuel remplacée par ce carrousel
// (CategoryHomeSections, avant le 2026-08-15) — conservée telle quelle sur demande
// utilisateur explicite : le carrousel react-slick ne doit pas agrandir les cards.
const CARD_WIDTH = 220;

/**
 * Carrousel générique par catégorie (Lot 5, home page — demande utilisateur explicite
 * 2026-08-15) : même librairie que `PropertyCarousel.tsx` ("Annonces récentes"),
 * react-slick — mais décorrélé du type `Property` et de `PropertyCard` pour accepter
 * n'importe quelle catégorie (items typés `unknown`, densité toujours "compact", le seul
 * gabarit de carte de la plateforme). `variableWidth` + largeur fixe par slide (au lieu de
 * `slidesToShow` par breakpoint comme PropertyCarousel) : le nombre de cards visibles varie
 * avec la largeur d'écran, mais leur taille reste constante — pas de cards géantes sur
 * grand écran. Pas de handler de clic sur le conteneur : la navigation est déjà portée par
 * `ListingCard` lui-même.
 */
const ArrowButton: React.FC<{ direction: "prev" | "next"; onClick?: () => void }> = ({ direction, onClick }) => {
  const Icon = direction === "prev" ? FaArrowLeft : FaArrowRight;
  const position = direction === "prev" ? "left-0" : "right-0";
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Précédent" : "Suivant"}
      onClick={onClick}
      className={`absolute ${position} top-1/2 -translate-y-1/2 z-10 group
                  border border-primary p-2 rounded-full shadow-lg
                  bg-white/80 hover:bg-primary transition-all duration-300
                  hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
    >
      <Icon className="w-4 h-4 text-primary-900 group-hover:text-white transition-colors duration-300" />
    </button>
  );
};

type ListingCardsCarouselProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  hideDate?: boolean;
};

export default function ListingCardsCarousel({ items, hideDate = false }: ListingCardsCarouselProps) {
  const count = items.length;
  const hasMultiple = count > 1;

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

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative px-4">
      {hasMultiple ? (
        <Slider {...settings}>
          {items.map((item: any) => (
            <div key={item.id} className="p-2" style={{ width: CARD_WIDTH }}>
              <ListingCard property={item} density="compact" hideDate={hideDate} />
            </div>
          ))}
        </Slider>
      ) : (
        items[0] && (
          <div className="mx-auto" style={{ width: CARD_WIDTH }}>
            <ListingCard property={items[0]} density="compact" hideDate={hideDate} />
          </div>
        )
      )}
    </div>
  );
}
