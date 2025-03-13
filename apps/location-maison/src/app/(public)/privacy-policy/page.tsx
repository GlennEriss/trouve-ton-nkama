"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      {/* Carte principale */}
      <Card className="shadow-lg border border-gray-200">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-gray-900">
            Politique de Confidentialité
          </CardTitle>
          <p className="text-gray-600 text-sm text-center mt-2">
            Dernière mise à jour : 10 mars 2025
          </p>
        </CardHeader>

        <CardContent>
          <p className="text-gray-700 text-md leading-relaxed">
            Bienvenue sur Home-Rent, votre plateforme de publication d'annonces de logements à louer.
            Nous nous engageons à protéger votre vie privée et à assurer la transparence quant à la collecte,
            l'utilisation et la protection de vos données personnelles.
          </p>

          <Separator className="my-6" />

          <h2 className="text-xl font-semibold text-gray-800 mt-4">1. Données collectées</h2>
          <p className="text-gray-700 text-md leading-relaxed mt-2">
            Nous collectons les informations suivantes lorsque vous utilisez notre site :
          </p>
          <ul className="list-disc pl-6 text-gray-700 text-md">
            <li>Nom et prénom</li>
            <li>Adresse e-mail</li>
            <li>Numéro de téléphone</li>
            <li>Photos et descriptions des annonces postées</li>
            <li>Données de connexion (adresse IP, appareil utilisé, navigateur)</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">2. Utilisation des données</h2>
          <p className="text-gray-700 text-md leading-relaxed mt-2">
            Nous utilisons vos informations pour :
          </p>
          <ul className="list-disc pl-6 text-gray-700 text-md">
            <li>Publier et gérer vos annonces</li>
            <li>Améliorer l'expérience utilisateur</li>
            <li>Vous notifier en cas de mise à jour ou modification</li>
            <li>Respecter les obligations légales en vigueur au Gabon</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">3. Partage des données</h2>
          <p className="text-gray-700 text-md leading-relaxed mt-2">
            Nous ne partageons pas vos données avec des tiers, sauf dans les cas suivants :
          </p>
          <ul className="list-disc pl-6 text-gray-700 text-md">
            <li>Obligation légale ou demande des autorités gabonaises</li>
            <li>Partenaires techniques nécessaires au fonctionnement du site</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">4. Sécurité des données</h2>
          <p className="text-gray-700 text-md leading-relaxed mt-2">
            Nous mettons en place des mesures de sécurité avancées pour protéger vos données contre tout accès non autorisé.
          </p>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">5. Vos droits</h2>
          <p className="text-gray-700 text-md leading-relaxed mt-2">
            Conformément aux lois gabonaises, vous avez le droit de :
          </p>
          <ul className="list-disc pl-6 text-gray-700 text-md">
            <li>Accéder à vos données</li>
            <li>Demander la suppression ou modification de vos informations</li>
            <li>Vous opposer à l’utilisation de vos données</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">6. Contact</h2>
          <p className="text-gray-700 text-md leading-relaxed mt-2">
            Pour toute question concernant cette politique, veuillez nous contacter à :
            <span className="font-medium text-blue-600"> contact@home-rent.com</span>.
          </p>

          <Separator className="my-6" />

          <p className="text-sm text-gray-500 text-center">
            © 2025 Home-Rent. Tous droits réservés.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}