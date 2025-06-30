"use client";

import React, { useRef, useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWindowSize } from "@/hooks/useSize";
import PrivacyPolicyMobile from "@/components/privacy-policy/PrivacyPolicyMobile";
import Image from "next/image";
import { Link2 } from "lucide-react";

const sections = [
  {
    id: "collecte",
    title: "Données collectées",
    description: "Nous collectons les informations suivantes lorsque vous utilisez notre site :",
    list: [
      "Nom et prénom",
      "Adresse e-mail",
      "Numéro de téléphone",
      "Photos et descriptions des annonces postées",
      "Données de connexion (adresse IP, appareil utilisé, navigateur)"
    ]
  },
  {
    id: "utilisation",
    title: "Utilisation des données",
    description: "Nous utilisons vos informations pour :",
    list: [
      "Publier et gérer vos annonces",
      "Améliorer l'expérience utilisateur",
      "Vous notifier en cas de mise à jour ou modification",
      "Respecter les obligations légales en vigueur au Gabon"
    ]
  },
  {
    id: "partage",
    title: "Partage des données",
    description: "Nous ne partageons pas vos données avec des tiers, sauf dans les cas suivants :",
    list: [
      "Obligation légale ou demande des autorités gabonaises",
      "Partenaires techniques nécessaires au fonctionnement du site"
    ]
  },
  {
    id: "securite",
    title: "Sécurité des données",
    description: "Nous mettons en place des mesures de sécurité avancées pour protéger vos données contre tout accès non autorisé."
  },
  {
    id: "droits",
    title: "Vos droits",
    description: "Conformément aux lois gabonaises, vous avez le droit de :",
    list: [
      "Accéder à vos données",
      "Demander la suppression ou modification de vos informations",
      "Vous opposer à l'utilisation de vos données"
    ]
  }
];

export default function PrivacyPolicyClientPage() {
    const size = useWindowSize()
    const [activeSection, setActiveSection] = useState("collecte");
    const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const scrollToSection = (sectionId: string) => {
      setActiveSection(sectionId);
      const element = sectionRefs.current[sectionId];
      if (element) {
        const offset = 120;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    };

    useEffect(() => {
      const handleScroll = () => {
        let currentSection = sections[0].id;
        let minDistance = Infinity;

        // Trouve la section la plus proche du haut de la fenêtre
        Object.entries(sectionRefs.current).forEach(([id, element]) => {
          if (element) {
            const rect = element.getBoundingClientRect();
            const distance = Math.abs(rect.top - 120); // 120px correspond à l'offset
            if (distance < minDistance) {
              minDistance = distance;
              currentSection = id;
            }
          }
        });

        setActiveSection(currentSection);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Appel initial

      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (size.width < 768) {
      return <PrivacyPolicyMobile />
    }

    return (
      <div className="min-h-screen bg-gray-50 relative overflow-hidden">
        {/* Images d'anges gardiens */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
          <div className="relative w-full h-full">
            <Image
              src="/assets/privacy-policy/privacy-img.webp"
              alt="Guardian Angel"
              width={400}
              height={400}
              className="absolute top-20 -left-20 transform rotate-[-15deg]"
            />
            <Image
              src="/assets/privacy-policy/privacy-img.webp"
              alt="Guardian Angel"
              width={400}
              height={400}
              className="absolute top-20 -right-20 transform rotate-15 scale-x-[-1]"
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-16 relative">
          {/* En-tête */}
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-transparent bg-clip-text">
              Politique de Confidentialité
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Nous nous engageons à protéger vos données personnelles avec la plus grande attention
            </p>
            <p className="text-sm text-gray-500">
              Dernière mise à jour : 28 avril 2025
            </p>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Navigation latérale */}
            <div className="col-span-4 xl:col-span-3">
              <div className="fixed top-24 max-h-[calc(100vh-120px)] overflow-y-auto w-[280px] bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 px-2">Sommaire</h3>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                        activeSection === section.id
                          ? "bg-[#146B67] text-white shadow-lg transform scale-105"
                          : "hover:bg-gray-100 text-gray-700 hover:transform hover:scale-102"
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="col-span-8 xl:col-span-9">
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                <CardContent className="p-8">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      id={section.id}
                      ref={(el) => { sectionRefs.current[section.id] = el; }}
                      className={`space-y-6 transition-all duration-500 ${
                        activeSection === section.id 
                          ? "opacity-100 transform translate-y-0" 
                          : "opacity-50 transform translate-y-4"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-800">
                          {section.title}
                        </h2>
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.href}#${section.id}`)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          title="Copier le lien de la section"
                        >
                          <Link2 size={16} className="text-gray-500" />
                        </button>
                      </div>

                      <p className="text-gray-600 text-lg">
                        {section.description}
                      </p>

                      {section.list && (
                        <ul className="space-y-3">
                          {section.list.map((item) => (
                            <li key={item} className="flex items-start gap-3 text-gray-600">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#1FA89B]" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Separator className="my-8" />
                    </div>
                  ))}

                  {/* Section Contact */}
                  <div className="text-center space-y-4 mt-8">
                    <p className="text-gray-600">
                      Pour toute question concernant cette politique, contactez-nous à :
                      {" "}
                      <a
                        href={`mailto:${process.env.NEXT_PUBLIC_EMAIL_SUPPORT}`}
                        className="ml-2 font-medium text-[#146B67] hover:text-[#1FA89B] transition-colors"
                      >
                        {process.env.NEXT_PUBLIC_EMAIL_SUPPORT}
                      </a>
                    </p>
                    <p className="text-sm text-gray-400">
                      © 2025 LogisGabon. Tous droits réservés.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
}
