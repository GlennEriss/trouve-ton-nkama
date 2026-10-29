'use client';

import { Children, useEffect, useState, type ReactNode } from 'react';
import Slider, { type CustomArrowProps } from 'react-slick';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

function Arrow({ direction, onClick, className }: CustomArrowProps & { direction: 'prev' | 'next' }) {
  const Icon = direction === 'prev' ? FaArrowLeft : FaArrowRight;
  return <button type="button" aria-label={direction === 'prev' ? 'Précédent' : 'Suivant'}
    disabled={className?.includes('slick-disabled')} onClick={onClick}
    className={`absolute -bottom-12 ${direction === 'prev' ? 'left-0' : 'right-0'} z-10 flex h-11 w-11 items-center justify-center rounded-full border border-primary bg-white text-primary shadow-sm hover:bg-primary hover:text-white disabled:opacity-40 dark:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}>
    <Icon aria-hidden="true" />
  </button>;
}

/** Same slider engine as the other homepage sections, without property-specific logic. */
export default function HomeCardsCarousel({ children, label }: { children: ReactNode; label: string }) {
  const cards = Children.toArray(children);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  if (!cards.length) return null;
  if (cards.length === 1) return <div className="max-w-md">{cards[0]}</div>;
  return <div role="group" aria-label={label} aria-roledescription="carrousel"
    className="min-w-0 pb-12 [&_.slick-track]:flex [&_.slick-slide]:h-auto [&_.slick-slide>div]:h-full">
    <Slider dots infinite={false} autoplay={false} accessibility speed={reducedMotion ? 0 : 300}
      slidesToShow={Math.min(3, cards.length)} slidesToScroll={1} swipeToSlide
      prevArrow={<Arrow direction="prev" />} nextArrow={<Arrow direction="next" />}
      responsive={[
        { breakpoint: 1024, settings: { slidesToShow: Math.min(2, cards.length) } },
        { breakpoint: 640, settings: { slidesToShow: 1 } },
      ]}>
      {cards.map((card, index) => <div key={index} className="h-full px-2 py-1">{card}</div>)}
    </Slider>
  </div>;
}
