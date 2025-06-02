"use client";

import React, { useCallback } from "react";
import Slider from "react-slick";
import { motion } from "framer-motion";
import { FaHome, FaBuilding, FaWarehouse, FaStore } from "react-icons/fa";
import { BiBed } from "react-icons/bi";
import { MdOutlineApartment, MdOutlineWorkspaces } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { getTypePropertyKey, TypeProperty } from "@/lib/utils";
import PropertyCarousel from "../property/PropertyCarousel";
import MapComponent, { Neighborhood } from "../map/MapComponent";
import houseMocks from "@/mocks/mocksHouse";
import { routes } from "@/constantes/routes";
import { useRefinementList } from "react-instantsearch";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import AlgoliaRefinements, { useAlgoliaRefinements } from "@/providers/AlgoliaRefinementsContext";
import { useRouter } from "next/navigation";
import { propertyTypesList } from "./PropertyTypeList";

const neighborhoods: Neighborhood[] = [
  {
    name: "Louis",
    coordinates: [
      [0.3916, 9.4538],
      [0.3919, 9.4565],
      [0.3908, 9.4572],
      [0.3897, 9.4544],
      [0.3916, 9.4538],
    ],
  },
  {
    name: "Akébé",
    coordinates: [
      [0.3941, 9.4511],
      [0.3958, 9.4533],
      [0.3934, 9.4546],
      [0.3918, 9.4528],
      [0.3941, 9.4511],
    ],
  },
  {
    name: "Nombakélé",
    coordinates: [
      [0.3892, 9.4497],
      [0.3905, 9.452],
      [0.3881, 9.453],
      [0.3867, 9.4508],
      [0.3892, 9.4497],
    ],
  },
  {
    name: "Glass",
    coordinates: [
      [0.3967, 9.4595],
      [0.398, 9.4612],
      [0.3962, 9.4624],
      [0.3948, 9.4607],
      [0.3967, 9.4595],
    ],
  },
  {
    name: "Montagne Sainte",
    coordinates: [
      [0.393, 9.449],
      [0.3947, 9.451],
      [0.3925, 9.4525],
      [0.391, 9.4503],
      [0.393, 9.449],
    ],
  },
];

const HomePage = () => {

  const {
    city,
    setCity,
    street,
    setStreet,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    minArea,
    setMinArea,
    maxArea,
    setMaxArea,
    minNbrRooms,
    setMinNbrRooms,
    maxNbrRooms,
    setMaxNbrRooms,
    typeProperty,
    setTypeProperty,
    tags,
    setTags,
    clearFilters,
  } = useAlgoliaContext();
  const { datas } = useAlgoliaRefinements();


  const toggleSelection = useCallback(
    (list: string[], item: string, setter: (val: string[]) => void) => {
      if (list.includes(item)) {
        const newList = list.filter((i) => i !== item);
        //console.log(`Retrait de l'élément "${item}". Nouvelle liste :`, newList);
        setter(newList);
      } else {
        const newList = [...list, item];
        //console.log(`Ajout de l'élément "${item}". Nouvelle liste :`, newList);
        setter(newList);
      }
    },
    []
  );

  const adCarouselSettings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 4000,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  const router = useRouter();

  const { items: typePropItems, refine: typePropertyRefine } = useRefinementList({
    attribute: "typeProperty",
    operator: "or", // ou "and" selon la logique voulue
  });

  

  function handleTypeClick(
    type: string,
    typeProperty: string[],
    getTypePropertyKey: (type: string) => string | undefined,
    setTypeProperty: (props: string[]) => void,
    typePropertyRefine: (value: string) => void,
  ) {
    console.log("click")
    const key = getTypePropertyKey(type)!;
    toggleSelection(typeProperty, key, setTypeProperty);
    //typePropertyRefine(type);
    router.push(`/search?typeProperty=${encodeURIComponent(type)}`);
  }

  //console.log("datas:", datas)

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-100 dark:bg-gray-900 transition-colors mb-10">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white text-center py-10 mb-16 rounded-lg shadow-lg">
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
          <a href={routes.public.search_property} rel="noopener noreferrer">
            <Button className="bg-white text-[#146B67] px-6 py-3 rounded-full shadow-md hover:bg-gray-100">
              Explorer
            </Button>
          </a>
        </motion.div>
      </section>

      {/* Section des types de logements */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold text-center mb-8 text-[#146B67] dark:text-gray-200">
          Types de logements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {propertyTypesList.map((type) => (
            <motion.div
              key={type.type}
              className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
              whileHover={{ scale: 1.05 }}
              /* onClick={() => {
                window.location.href = `/search?typeProperty=${type.type}`;
              }} */
              onClick={() => {
                handleTypeClick(
                  type.type ?? "",
                  typeProperty,
                  getTypePropertyKey,
                  setTypeProperty,
                  typePropertyRefine,
                )
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
      {/* <section className="mb-16 w-full">
  <Slider {...adCarouselSettings}>
    {ads.map((ad) => (
      <div key={ad.id} className="p-2">
        <a href={ad.link} target="_blank" rel="noopener noreferrer">
          <img
            src={ad.image}
            alt={`Ad ${ad.id}`}
            className="w-full sm:h-80 h-56 object-cover rounded-lg shadow-md"
          />
        </a>
      </div>
    ))}
  </Slider>
</section> */}

      {/* Logements en vedette */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold text-center text-[#146B67] dark:text-gray-200">
          Logements récents
        </h2>
        <PropertyCarousel properties={[]} />
      </section>

      {/* Section de la map */}
      {/* <section className="mb-16">
        <h2 className="text-3xl font-semibold text-center mb-6 text-gray-800 dark:text-gray-200">
          Trouvez votre propriété sur la carte
        </h2>
        <div className="w-full h-96 rounded-lg shadow-lg overflow-hidden">
          <MapComponent houses={houseMocks} neighborhoods={neighborhoods} />
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3357.5285037442964!2d9.4077066!3d0.4473876!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f50!3m3!1m2!1s0x107f24adbf1740a3%3A0x25c7c1ada0b81a2d!2sCharbonnages%2C%20Libreville%2C%20Gabon!5e0!3m2!1sen!2s!4v1684837560218"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            className="rounded-lg"
          ></iframe>
        </div>
      </section> */}

      {/* Call-to-action */}
      <section className="bg-blue-500 text-white text-center py-12 rounded-lg shadow-lg">
        <h2 className="text-4xl font-bold mb-4">
          Vous avez une propriété à louer ou vendre ?
        </h2>
        <p className="text-lg mb-6">
          Créez votre annonce dès maintenant et atteignez des milliers de
          clients potentiels.
        </p>
        <a href={routes.protected.add_property} rel="noopener noreferrer">
          <Button className="bg-white text-blue-500 px-6 py-3 rounded-full hover:bg-gray-100">
            Poster une annonce
          </Button>
        </a>

      </section>
    </div>
  );
};

export default HomePage;
