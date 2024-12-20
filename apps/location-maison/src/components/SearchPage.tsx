"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

// Tableau des 50 profils d'escortes
const profiles = Array.from({ length: 50 }, (_, i) => ({
  name: `Escorte ${i + 1}`,
  description: `Disponible pour des services exclusifs.`,
  image: `photo.avif`, // Remplacez par vos URLs d'images réelles
}));

export default function SearchPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrage des profils en fonction de la barre de recherche
  const filteredProfiles = profiles.filter((profile) =>
    profile.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-white dark:bg-black min-h-screen">

      {/* Titre */}
      <h1 className="text-3xl font-bold text-center mb-8 text-black dark:text-white">
        Explorez les Escortes
      </h1>

      {/* Grille des profils */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredProfiles.map((profile, index) => (
          <Card
            key={index}
            className={`rounded-xl shadow-md overflow-hidden transition-transform hover:scale-105 ${
              index % 2 === 0
                ? "bg-gradient-to-r from-red-500 via-yellow-500 to-pink-500"
                : "bg-gradient-to-r from-blue-500 via-green-500 to-purple-500"
            }`}
          >
            <div className="relative w-full h-40">
              <Image
                src={profile.image}
                alt={`${profile.name}'s profile`}
                fill
                className="object-cover"
              />
            </div>
            <CardHeader className="p-4 text-xl font-semibold text-black dark:text-white">
              {profile.name}
            </CardHeader>
            <CardContent className="px-4 pb-4 text-sm text-black dark:text-white">
              {profile.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}