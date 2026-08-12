"use client";

import { Button } from "@trouve-ton-nkama/ui/button";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogTrigger,
  DialogTitle,
} from "@trouve-ton-nkama/ui/dialog";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

export default function LanguageModal() {
  const [open, setOpen] = useState(false); // Gérer l'état ouvert/fermé
  const [selectedLanguage, setSelectedLanguage] = useState("FR"); // Langue sélectionnée

  // Fonction pour changer la langue
  const handleChangeLanguage = (lang: string) => {
    setSelectedLanguage(lang); // Met à jour la langue sélectionnée
    setOpen(false); // Ferme la modale après la sélection
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Déclencheur pour ouvrir la modale */}
      <DialogTrigger asChild>
        <p className="text-sm font-semibold cursor-pointer bg-gray-200 p-2 rounded-xl text-black">
          {selectedLanguage}
        </p>
      </DialogTrigger>

      {/* Contenu de la modale */}
      <DialogPortal>
        <DialogContent
          style={{ borderRadius: "24px" }}
          className="bg-white dark:bg-black text-black dark:text-white max-w-md mx-auto p-6 border-none rounded-xl"
        >
          {/* Titre caché pour l'accessibilité */}
          <DialogTitle className="sr-only">Changer de langue</DialogTitle>

          {/* En-tête avec Chevron pour fermer */}
          <div className="flex flex-initial items-center gap-2 rounded-xl">
          <ChevronLeft
              className="w-8 h-8 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-900 rounded-full"
              onClick={() => setOpen(false)} // Fermer la modale en cliquant sur le chevron
            />
            <h2 className="text-xl font-bold">Changer de langue</h2>
          </div>

          {/* Liste des langues */}
          <div className="flex flex-col gap-4 mt-6 items-center py-6 rounded-lg mx-auto max-w-[250px] w-full">
            {/* Bouton : Portugais - Brésil */}
            <Button
              className={`${
                selectedLanguage === "PT"
                  ? "bg-red-900 dark:bg-red-900 hover:bg-red-700"
                  : "bg-red-800 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600"
              } text-white rounded-xl py-5 w-full text-center font-semibold`}
              onClick={() => handleChangeLanguage("PT")}
            >
              Portugais - Brésil
            </Button>

            {/* Bouton : France française */}
            <Button
              className={`${
                selectedLanguage === "FR"
                  ? "bg-red-900 dark:bg-red-900 hover:bg-red-700"
                  : "bg-red-800 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600"
              } text-white rounded-xl py-5 w-full text-center font-semibold`}
              onClick={() => handleChangeLanguage("FR")}
            >
              France française
            </Button>

            {/* Bouton : États-Unis Anglais */}
            <Button
              className={`${
                selectedLanguage === "EN"
                  ? "bg-red-900 dark:bg-red-900 hover:bg-red-700"
                  : "bg-red-800 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600"
              } text-white  rounded-xl py-5 w-full text-center font-semibold`}
              onClick={() => handleChangeLanguage("EN")}
            >
              États-Unis Anglais
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}