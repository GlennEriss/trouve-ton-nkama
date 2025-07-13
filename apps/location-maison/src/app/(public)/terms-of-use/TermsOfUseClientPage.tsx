'use client'

import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { routes } from "@/constantes/routes";
import { useWindowSize } from "@/hooks/useSize";
import TermsOfUseMobilePage from "@/components/terms-of-use/TermsOfUseMobilePage";
import Image from "next/image";
import { Link2 } from "lucide-react";

const sections = [
  {
    id: "introduction",
    title: "Introduction",
    description: "Bienvenue sur Trouve Ton Nkama. En accédant et en utilisant notre plateforme, vous acceptez nos conditions d'utilisation."
  },
  {
    id: "utilisation",
    title: "Utilisation de la plateforme",
    description: "Trouve Ton Nkama est une plateforme permettant aux utilisateurs de publier et consulter des annonces de location immobilière. L'utilisation du site doit être conforme aux lois en vigueur et aux règles éthiques de la communauté."
  },
  {
    id: "contenu",
    title: "Contenu et responsabilité",
    description: "Chaque utilisateur est responsable du contenu qu'il publie sur Trouve Ton Nkama. Les annonces ne doivent contenir ni informations trompeuses ni contenu illégal."
  },
  {
    id: "confidentialite",
    title: "Confidentialité et protection des données",
    description: "La protection de vos données est notre priorité. Nous collectons et utilisons vos informations conformément à notre Politique de Confidentialité.",
    link: {
      text: "Politique de Confidentialité",
      url: routes.public.confidentiality
    }
  },
  {
    id: "modifications",
    title: "Modifications des conditions",
    description: "Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés des changements importants."
  },
  {
    id: "contact",
    title: "Contact",
    description: "Pour toute question relative à ces conditions, vous pouvez nous contacter à :",
    email: process.env.NEXT_PUBLIC_EMAIL_SUPPORT
  }
];

export default function TermsOfUseClientPage() {
    const size = useWindowSize()
    const [activeSection, setActiveSection] = useState("introduction");
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

        Object.entries(sectionRefs.current).forEach(([id, element]) => {
          if (element) {
            const rect = element.getBoundingClientRect();
            const distance = Math.abs(rect.top - 120);
            if (distance < minDistance) {
              minDistance = distance;
              currentSection = id;
            }
          }
        });

        setActiveSection(currentSection);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();

      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (size.width < 768) {
        return <TermsOfUseMobilePage />
    }

    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
          {/* Image de fond */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
            <div className="relative w-full h-full">
              <Image
                src="/assets/privacy-policy/terms-of-use-img.webp"
                alt="Terms Background"
                width={400}
                height={400}
                className="absolute top-20 -left-20 transform rotate-[-15deg]"
              />
              <Image
                src="/assets/privacy-policy/terms-of-use-img.webp"
                alt="Terms Background"
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
                Conditions d'Utilisation
              </h1>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Découvrez les règles qui régissent l'utilisation de notre plateforme
              </p>
              <p className="text-sm text-gray-500">
                Dernière mise à jour : 28 avril 2025
              </p>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Navigation latérale */}
              <div className="col-span-3">
                <div className="fixed top-24 max-h-[calc(100vh-120px)] overflow-y-auto w-[240px] bg-white/80 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-100">
                  <h3 className="text-base font-semibold text-gray-800 mb-3 px-2">Sommaire</h3>
                  <nav className="space-y-1.5">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
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
              <div className="col-span-9">
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
                          {section.link && (
                            <a
                              href={section.link.url}
                              className="ml-1 text-[#146B67] hover:text-[#1FA89B] transition-colors underline"
                            >
                              {section.link.text}
                            </a>
                          )}
                          {section.email && (
                            <a
                              href={`mailto:${section.email}`}
                              className="ml-1 text-[#146B67] hover:text-[#1FA89B] transition-colors"
                            >
                              {section.email}
                            </a>
                          )}
                        </p>

                        <Separator className="my-8" />
                      </div>
                    ))}

                    {/* Section Contact */}
                    <div className="text-center space-y-4 mt-8">
                      <p className="text-sm text-gray-400">
                        © 2025 Trouve Ton Nkama. Tous droits réservés.
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
