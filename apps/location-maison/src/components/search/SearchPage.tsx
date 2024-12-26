"use client";
import houseMocks from "@/mocks/mocksHouse";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import HouseCard from "../home-page/HouseCards";

/* // Tableau des 50 profils d'escortes
const profiles = Array.from({ length: 50 }, (_, i) => ({
  name: `Escorte ${i + 1}`,
  description: `Disponible pour des services exclusifs.`,
  image: `photo.avif`, // Remplacez par vos URLs d'images réelles
})); */

export default function HomePage() {
  const {
    filteredResults,
    //applyRefinements,
  } = useAlgoliaContext();

  console.log("filteredResults:", filteredResults);

  return (
    <div className="p-6 bg-white dark:bg-black min-h-screen mb-20">
      {/* Titre */}
      <h1 className="text-3xl font-bold text-center mb-8 text-black dark:text-white">
      Trouvez votre chez-vous
      </h1>

      {/* Grille des profils */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {houseMocks.map((house, index) => (
          <HouseCard key={index} house={house} index={index} />
        ))}
      </div>
    </div>
  );
}