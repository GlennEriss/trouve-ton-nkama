'use client'

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { routes } from "@/constantes/routes";

export default function TermsOfUsePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Conditions d&apos;Utilisation
          </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-gray-600 text-center mb-6">
              Dernière mise à jour : 11 Mars 2025
            </p>
            
            <Separator className="mb-6" />
            
            {/* Table des matières */}
            <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
              <li><a href="#introduction" className="hover:underline">1. Introduction</a></li>
              <li><a href="#utilisation" className="hover:underline">2. Utilisation de la plateforme</a></li>
              <li><a href="#contenu" className="hover:underline">3. Contenu et responsabilité</a></li>
              <li><a href="#confidentialite" className="hover:underline">4. Confidentialité et protection des données</a></li>
              <li><a href="#modifications" className="hover:underline">5. Modifications des conditions</a></li>
              <li><a href="#contact" className="hover:underline">6. Contact</a></li>
            </ul>

            <Separator className="mb-6" />

            {/* Sections détaillées */}
            <section id="introduction" className="mb-6">
              <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
              <p className="text-gray-700">
                Bienvenue sur <strong>Home-Rent</strong>. En accédant et en utilisant notre plateforme, vous acceptez nos conditions d&apos;utilisation.
              </p>
            </section>

            <section id="utilisation" className="mb-6">
              <h2 className="text-xl font-semibold mb-2">2. Utilisation de la plateforme</h2>
              <p className="text-gray-700">
                Home-Rent est une plateforme permettant aux utilisateurs de publier et consulter des annonces de location immobilière.
                L&apos;utilisation du site doit être conforme aux lois en vigueur et aux règles éthiques de la communauté.
              </p>
            </section>

            <section id="contenu" className="mb-6">
              <h2 className="text-xl font-semibold mb-2">3. Contenu et responsabilité</h2>
              <p className="text-gray-700">
                Chaque utilisateur est responsable du contenu qu&apos;il publie sur Home-Rent. Les annonces ne doivent contenir ni informations
                trompeuses ni contenu illégal.
              </p>
            </section>

            <section id="confidentialite" className="mb-6">
              <h2 className="text-xl font-semibold mb-2">4. Confidentialité et protection des données</h2>
              <p className="text-gray-700">
                La protection de vos données est notre priorité. Nous collectons et utilisons vos informations conformément à notre 
                <a href={routes.public.confidentiality} className="text-blue-500 hover:underline"> Politique de Confidentialité</a>.
              </p>
            </section>

            <section id="modifications" className="mb-6">
              <h2 className="text-xl font-semibold mb-2">5. Modifications des conditions</h2>
              <p className="text-gray-700">
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés des changements importants.
              </p>
            </section>

            <section id="contact" className="mb-6">
              <h2 className="text-xl font-semibold mb-2">6. Contact</h2>
              <p className="text-gray-700">
                Pour toute question relative à ces conditions, vous pouvez nous contacter à :  
                <a href={`mailto:${process.env.NEXT_PUBLIC_EMAIL_SUPPORT}`} className="text-blue-500 hover:underline"> {process.env.NEXT_PUBLIC_EMAIL_SUPPORT}</a>.
              </p>
            </section>
        </CardContent>
      </Card>
    </div>
  );
}