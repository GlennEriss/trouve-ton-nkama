"use client";

import React from "react";
import Slider from "react-slick";
import { motion } from "framer-motion";
import { FaHome, FaBuilding, FaWarehouse, FaStore } from "react-icons/fa";
import { BiBed } from "react-icons/bi";
import { MdOutlineApartment, MdOutlineWorkspaces } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { TypeProperty } from "@/lib/utils";
import PropertyCarousel from "../property/PropertyCarousel";

const HomePage = () => {
  const adCarouselSettings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 4000,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  const propertyTypes = [
    { type: "House", icon: <FaHome className="w-10 h-10 text-blue-500" /> },
    {
      type: "Apartment",
      icon: <FaBuilding className="w-10 h-10 text-green-500" />,
    },
    {
      type: "Studio",
      icon: <MdOutlineApartment className="w-10 h-10 text-yellow-500" />,
    },
    { type: "Room", icon: <BiBed className="w-10 h-10 text-red-500" /> },
    { type: "Kiosk", icon: <FaStore className="w-10 h-10 text-orange-500" /> },
    {
      type: "Shop",
      icon: <FaWarehouse className="w-10 h-10 text-purple-500" />,
    },
    {
      type: "Office",
      icon: <MdOutlineWorkspaces className="w-10 h-10 text-teal-500" />,
    },
  ];

  // Mock des maisons en vedette
  const houses = [
    {
      id: 1,
      images: [
        {
          fileURL:
            "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
        },
      ],
      title: "Villa moderne avec piscine",
      city: "Dakar",
      province: "Dakar",
      country: "Sénégal",
      street: "Rue de la Corniche",
      status: "FOR_RENT",
      price: "300 000",
      nbrRooms: 5,
      nbrToilets: 4,
      area: 250,
      typeProperty: "House",
    },
    {
      id: 2,
      images: [
        {
          fileURL:
            "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
        },
      ],
      title: "Appartement luxueux en bord de mer",
      city: "Abidjan",
      province: "Lagunes",
      country: "Côte d'Ivoire",
      street: "Zone 4",
      status: "FOR_SALE",
      price: "200 000 000",
      nbrRooms: 3,
      nbrToilets: 2,
      area: 180,
      typeProperty: "Apartment",
    },
    {
      id: 3,
      images: [
        {
          fileURL:
            "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
        },
      ],
      title: "Maison familiale spacieuse",
      city: "Casablanca",
      province: "Grand Casablanca",
      country: "Maroc",
      street: "Quartier Palmier",
      status: "FOR_RENT",
      price: "150 000",
      nbrRooms: 4,
      nbrToilets: 3,
      area: 220,
      typeProperty: "House",
    },
    {
      id: 4,
      images: [
        {
          fileURL:
            "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
        },
      ],
      title: "Maison familiale spacieuse",
      city: "Casablanca",
      province: "Grand Casablanca",
      country: "Maroc",
      street: "Quartier Palmier",
      status: "FOR_RENT",
      price: "150 000",
      nbrRooms: 4,
      nbrToilets: 3,
      area: 220,
      typeProperty: "House",
    },
    {
      id: 5,
      images: [
        {
          fileURL:
            "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
        },
      ],
      title: "Maison familiale spacieuse",
      city: "Casablanca",
      province: "Grand Casablanca",
      country: "Maroc",
      street: "Quartier Palmier",
      status: "FOR_RENT",
      price: "150 000",
      nbrRooms: 4,
      nbrToilets: 3,
      area: 220,
      typeProperty: "House",
    },
    {
      id: 6,
      images: [
        {
          fileURL:
            "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
        },
      ],
      title: "Maison familiale spacieuse",
      city: "Casablanca",
      province: "Grand Casablanca",
      country: "Maroc",
      street: "Quartier Palmier",
      status: "FOR_RENT",
      price: "150 000",
      nbrRooms: 4,
      nbrToilets: 3,
      area: 220,
      typeProperty: "House",
    },
    {
      id: 7,
      images: [
        {
          fileURL:
            "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
        },
      ],
      title: "Maison familiale spacieuse",
      city: "Casablanca",
      province: "Grand Casablanca",
      country: "Maroc",
      street: "Quartier Palmier",
      status: "FOR_RENT",
      price: "150 000",
      nbrRooms: 4,
      nbrToilets: 3,
      area: 220,
      typeProperty: "House",
    },
    {
      id: 8,
      images: [
        {
          fileURL:
            "https://media.bazarafrique.com/upload/post/62320b769e379479930349.png",
        },
      ],
      title: "Maison familiale spacieuse",
      city: "Casablanca",
      province: "Grand Casablanca",
      country: "Maroc",
      street: "Quartier Palmier",
      status: "FOR_RENT",
      price: "150 000",
      nbrRooms: 4,
      nbrToilets: 3,
      area: 220,
      typeProperty: "House",
    },
  ];

  const ads = [
    {
      id: 1,
      image: "https://www.touchinnovative.com/img/blg/6-170223162621.jpg",
      link: "#",
    },
    {
      id: 2,
      image:
        "https://static.wixstatic.com/media/a533e7_c9ab2af50964476eb4c3f33ce31db6ce~mv2.jpg/v1/fill/w_618,h_388,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/a533e7_c9ab2af50964476eb4c3f33ce31db6ce~mv2.jpg",
      link: "#",
    },
    {
      id: 3,
      image: "https://www.touchinnovative.com/img/blg/6-170223162621.jpg",
      link: "#",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-center py-10 mb-16 rounded-lg shadow-lg">
        <motion.h1
          className="text-5xl font-bold mb-4"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Trouvez votre maison de rêve
        </motion.h1>
        <motion.p
          className="text-lg mb-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Explorez des milliers de propriétés adaptées à vos besoins.
        </motion.p>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <a href="/search" rel="noopener noreferrer">
            <Button className="bg-white text-blue-500 px-6 py-3 rounded-full shadow-md hover:bg-gray-100">
              Explorer
            </Button>
          </a>
        </motion.div>
      </section>

      {/* Section des types de logements */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold text-center mb-6 text-gray-800 dark:text-gray-200">
          Types de logements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {propertyTypes.map((type) => (
            <motion.div
              key={type.type}
              className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                window.location.href = `/search?category=${type.type}`;
              }}
            >
              {type.icon}
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-4">
                {TypeProperty[type.type]}
              </h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section des publicités */}
      <section className="mb-16">
        <Slider {...adCarouselSettings}>
          {ads.map((ad) => (
            <div key={ad.id} className="p-4">
              <a href={ad.link} target="_blank" rel="noopener noreferrer">
                <img
                  src={ad.image}
                  alt={`Ad ${ad.id}`}
                  className="w-full h-80 object-cover rounded-lg shadow-md"
                />
              </a>
            </div>
          ))}
        </Slider>
      </section>

      {/* Logements en vedette */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold text-center mb-6 text-gray-800 dark:text-gray-200">
          Logements en vedette
        </h2>
        <PropertyCarousel properties={houses} />
      </section>

      {/* Section de la map */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold text-center mb-6 text-gray-800 dark:text-gray-200">
          Trouvez votre propriété sur la carte
        </h2>
        <div className="w-full h-96 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-lg">
          {/* Remplacez l'iframe par une map interactive comme Leaflet ou Google Maps */}
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.8354345097714!2d-122.41941618468197!3d37.77492977975956!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80858064f1d1c91d%3A0x11d4794c44bb9ec5!2sSan%20Francisco%2C%20CA%2C%20USA!5e0!3m2!1sen!2s!4v1684837560218!5m2!1sen!2s"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            className="rounded-lg"
          ></iframe>
        </div>
      </section>

      {/* Call-to-action */}
      <section className="bg-blue-500 text-white text-center py-12 rounded-lg shadow-lg">
        <h2 className="text-4xl font-bold mb-4">
          Vous avez une propriété à louer ou vendre ?
        </h2>
        <p className="text-lg mb-6">
          Créez votre annonce dès maintenant et atteignez des milliers de
          clients potentiels.
        </p>
        <Button className="bg-white text-blue-500 px-6 py-3 rounded-full hover:bg-gray-100">
          Poster une annonce
        </Button>
      </section>
    </div>
  );
};

export default HomePage;
