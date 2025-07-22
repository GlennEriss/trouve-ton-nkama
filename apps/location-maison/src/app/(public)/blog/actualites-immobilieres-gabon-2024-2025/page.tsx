import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';

export const metadata: Metadata = {
  title: "Actualités Immobilières Gabon 2024-2025 - Projets, Lois, Tendances | Trouve Ton Nkama",
  description: "Actualités immobilières Gabon 2024-2025 : nouveaux projets, lois immobilières, tendances marché, investissements, développement urbain. Toute l'actualité immobilière du Gabon.",
  keywords: "actualités immobilières Gabon 2024, projets immobiliers Gabon, lois immobilières Gabon, tendances marché immobilier Gabon, investissements immobiliers Gabon",
  openGraph: {
    title: "Actualités Immobilières Gabon 2024-2025 - Projets & Tendances",
    description: "Actualités immobilières Gabon : nouveaux projets, lois, tendances marché. Toute l'actualité immobilière du Gabon.",
    url: `${process.env.NEXT_PUBLIC_HOST}/blog/actualites-immobilieres-gabon-2024-2025`,
    type: "article",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/linkedin-og.jpg`,
        width: 1200,
        height: 630,
        alt: "Actualités Immobilières Gabon 2024-2025",
      },
    ],
  },
};

export default function ActualitesImmobilieresGabon2024Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={routes.public.homePage} className="hover:text-[#146B67]">Accueil</Link>
          <span className="mx-2">→</span>
          <Link href={routes.public.blog} className="hover:text-[#146B67]">Blog</Link>
          <span className="mx-2">→</span>
          <span className="text-gray-800">Actualités Immobilières Gabon 2024-2025</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[#146B67] mb-4">
            Actualités Immobilières Gabon 2024-2025 : Projets, Lois, Tendances
          </h1>
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span>20 février 2024</span>
            <span className="mx-2">•</span>
            <span>25 min de lecture</span>
            <span className="mx-2">•</span>
            <span>Actualités</span>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Découvrez les dernières actualités immobilières du Gabon en 2024-2025 : 
            nouveaux projets de construction, évolutions législatives, tendances du marché, 
            investissements majeurs et développement urbain. Toute l&apos;actualité 
            immobilière du Gabon en temps réel.
          </p>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Nouveaux Projets Immobiliers 2024-2025
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Libreville - Projets Premium</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Résidence Glass Premium</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Localisation :</strong> Quartier Glass</li>
                      <li>• <strong>Type :</strong> 50 appartements de luxe</li>
                      <li>• <strong>Investissement :</strong> 15 milliards FCFA</li>
                      <li>• <strong>Livraison :</strong> 2025</li>
                      <li>• <strong>Prix :</strong> 800k-2M FCFA/mois</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Centre Commercial Akébé</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Localisation :</strong> Quartier Akébé</li>
                      <li>• <strong>Type :</strong> Centre commercial moderne</li>
                      <li>• <strong>Surface :</strong> 15 000 m²</li>
                      <li>• <strong>Livraison :</strong> 2024</li>
                      <li>• <strong>Impact :</strong> Hausse des prix locaux</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2">Impact sur le Marché</h4>
                  <p className="text-sm">
                    Ces projets premium vont renforcer l&apos;attractivité des quartiers 
                    Glass et Akébé avec une hausse attendue des prix de 10-15%.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Port-Gentil - Développement Économique</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Zone Olowé Extension</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Localisation :</strong> Quartier Olowé</li>
                      <li>• <strong>Type :</strong> 200 logements sociaux</li>
                      <li>• <strong>Investissement :</strong> 8 milliards FCFA</li>
                      <li>• <strong>Livraison :</strong> 2025</li>
                      <li>• <strong>Prix :</strong> 150k-300k FCFA/mois</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Résidence Montagne Sainte</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Localisation :</strong> Montagne Sainte</li>
                      <li>• <strong>Type :</strong> 30 villas de standing</li>
                      <li>• <strong>Surface :</strong> 120-200 m² par villa</li>
                      <li>• <strong>Livraison :</strong> 2024</li>
                      <li>• <strong>Prix :</strong> 1.5M-3M FCFA/mois</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Impact sur le Marché</h4>
                  <p className="text-sm">
                    Le développement d&apos;Olowé va créer une dynamique positive avec 
                    une plus-value attendue de 20-25% sur 3 ans.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Évolutions Législatives 2024-2025
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Nouvelle Loi Foncière 2024</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Améliorations</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Simplification :</strong> Procédures d&apos;acquisition</li>
                      <li>• <strong>Sécurisation :</strong> Titres fonciers numériques</li>
                      <li>• <strong>Transparence :</strong> Cadastre en ligne</li>
                      <li>• <strong>Protection :</strong> Droits des propriétaires</li>
                      <li>• <strong>Investissement :</strong> Incitations fiscales</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Nouvelles Obligations</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Certificat d&apos;urbanisme :</strong> Obligatoire</li>
                      <li>• <strong>Étude d&apos;impact :</strong> Projets &gt; 500m²</li>
                      <li>• <strong>Normes environnementales :</strong> Renforcées</li>
                      <li>• <strong>Contrôle qualité :</strong> Inspections régulières</li>
                      <li>• <strong>Assurance :</strong> Responsabilité civile obligatoire</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Impact sur les Investisseurs</h4>
                  <p className="text-sm">
                    La nouvelle loi sécurise les investissements mais augmente les coûts 
                    de 5-10% pour la conformité aux nouvelles normes.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Mesures Fiscales 2024-2025</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Incitations</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Réduction d&apos;impôt :</strong> 20% sur investissement</li>
                      <li>• <strong>Exonération :</strong> 5 ans pour logements sociaux</li>
                      <li>• <strong>Crédit d&apos;impôt :</strong> Rénovation énergétique</li>
                      <li>• <strong>Déduction :</strong> Intérêts d&apos;emprunt</li>
                      <li>• <strong>Amortissement :</strong> Accéléré pour neuf</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Nouvelles Taxes</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Taxe foncière :</strong> +15% en 2024</li>
                      <li>• <strong>Taxe d&apos;habitation :</strong> Nouvelle imposition</li>
                      <li>• <strong>Taxe environnementale :</strong> 2% sur construction</li>
                      <li>• <strong>Taxe de luxe :</strong> Biens &gt; 100M FCFA</li>
                      <li>• <strong>Taxe de spéculation :</strong> Revente &lt; 2 ans</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Impact sur le Marché</h4>
                  <p className="text-sm">
                    Les incitations favorisent l&apos;investissement locatif tandis que 
                    les nouvelles taxes impactent les biens de luxe et la spéculation.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Tendances du Marché 2024-2025
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Évolution des Prix par Ville</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Libreville</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Glass :</strong> +12% en 2024, +8% prévu 2025</li>
                      <li>• <strong>Akébé :</strong> +8% en 2024, +6% prévu 2025</li>
                      <li>• <strong>Louis :</strong> +10% en 2024, +9% prévu 2025</li>
                      <li>• <strong>Nzeng-Ayong :</strong> +15% en 2024, +12% prévu 2025</li>
                      <li>• <strong>Bellevue :</strong> +6% en 2024, +5% prévu 2025</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Port-Gentil</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Montagne Sainte :</strong> +10% en 2024, +8% prévu 2025</li>
                      <li>• <strong>Centre-Ville :</strong> +12% en 2024, +10% prévu 2025</li>
                      <li>• <strong>Olowé :</strong> +20% en 2024, +15% prévu 2025</li>
                      <li>• <strong>Matanda :</strong> +15% en 2024, +12% prévu 2025</li>
                      <li>• <strong>Zone Portuaire :</strong> +8% en 2024, +6% prévu 2025</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Analyse</h4>
                  <p className="text-sm">
                    Port-Gentil affiche une croissance plus dynamique grâce au développement 
                    économique et aux nouveaux projets d&apos;infrastructure.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Évolution des Types de Biens</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Croissance</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartements 2-3 pièces :</strong> +15% de demande</li>
                      <li>• <strong>Villas de standing :</strong> +20% de demande</li>
                      <li>• <strong>Bureaux :</strong> +25% de demande</li>
                      <li>• <strong>Entrepôts :</strong> +30% de demande</li>
                      <li>• <strong>Logements sociaux :</strong> +40% de demande</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Baisse</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Maisons anciennes :</strong> -5% de demande</li>
                      <li>• <strong>Studios :</strong> -10% de demande</li>
                      <li>• <strong>Locaux commerciaux :</strong> -8% de demande</li>
                      <li>• <strong>Garages :</strong> -15% de demande</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Tendances</h4>
                  <p className="text-sm">
                    La demande se concentre sur les biens modernes et fonctionnels, 
                    reflétant l&apos;évolution des modes de vie et des besoins professionnels.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Investissements Majeurs 2024-2025
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Investissements Institutionnels</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Banques et Assurances</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>BGFI :</strong> 50M FCFA en logements sociaux</li>
                      <li>• <strong>AFG Bank :</strong> 30M FCFA en bureaux</li>
                      <li>• <strong>NSIA Assurances :</strong> 25M FCFA en résidences</li>
                      <li>• <strong>Ecobank :</strong> 20M FCFA en commerces</li>
                      <li>• <strong>Total :</strong> 125M FCFA investis</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Institutions Publiques</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>État Gabonais :</strong> 200M FCFA en logements</li>
                      <li>• <strong>Mairie Libreville :</strong> 50M FCFA en équipements</li>
                      <li>• <strong>Mairie Port-Gentil :</strong> 30M FCFA en infrastructures</li>
                      <li>• <strong>ANIES :</strong> 40M FCFA en logements sociaux</li>
                      <li>• <strong>Total :</strong> 320M FCFA investis</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Impact sur le Marché</h4>
                  <p className="text-sm">
                    Ces investissements massifs (445M FCFA) vont stimuler le marché 
                    et créer de nouvelles opportunités pour les investisseurs privés.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Investissements Internationaux</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Investisseurs Français</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Bouygues :</strong> 100M FCFA en résidences</li>
                      <li>• <strong>Vinci :</strong> 80M FCFA en infrastructures</li>
                      <li>• <strong>EDF :</strong> 60M FCFA en logements</li>
                      <li>• <strong>Total :</strong> 240M FCFA investis</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Autres Investisseurs</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Chine :</strong> 150M FCFA en commerces</li>
                      <li>• <strong>Maroc :</strong> 70M FCFA en hôtellerie</li>
                      <li>• <strong>Turquie :</strong> 50M FCFA en bureaux</li>
                      <li>• <strong>Total :</strong> 270M FCFA investis</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Impact sur le Marché</h4>
                  <p className="text-sm">
                    Les investissements internationaux (510M FCFA) témoignent de 
                    la confiance dans le marché gabonais et vont moderniser l&apos;offre.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Développement Urbain et Infrastructures
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Infrastructures de Transport</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Libreville</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Boulevard de l&apos;Indépendance :</strong> Élargissement</li>
                      <li>• <strong>Pont sur l&apos;Estuaire :</strong> Nouveau projet</li>
                      <li>• <strong>Rocade périphérique :</strong> En construction</li>
                      <li>• <strong>Bus en site propre :</strong> 50 nouveaux bus</li>
                      <li>• <strong>Pistes cyclables :</strong> 20km supplémentaires</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Port-Gentil</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Route nationale 1 :</strong> Réhabilitation</li>
                      <li>• <strong>Port en eau profonde :</strong> Extension</li>
                      <li>• <strong>Aéroport :</strong> Modernisation</li>
                      <li>• <strong>Réseau routier :</strong> 30km de nouvelles routes</li>
                      <li>• <strong>Transport maritime :</strong> Nouveaux ferries</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Impact sur l&apos;Immobilier</h4>
                  <p className="text-sm">
                    Ces infrastructures vont améliorer l&apos;accessibilité et augmenter 
                    la valeur des biens dans les zones desservies (+10-15% de plus-value).
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Équipements et Services</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Santé</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>CHU Libreville :</strong> Nouveau bâtiment</li>
                      <li>• <strong>Cliniques privées :</strong> 5 nouvelles ouvertures</li>
                      <li>• <strong>Centres de diagnostic :</strong> 3 nouveaux</li>
                      <li>• <strong>Pharmacies :</strong> 20 nouvelles</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Éducation</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Université Omar Bongo :</strong> Extension</li>
                      <li>• <strong>Écoles internationales :</strong> 3 nouvelles</li>
                      <li>• <strong>Centres de formation :</strong> 10 nouveaux</li>
                      <li>• <strong>Bibliothèques :</strong> 5 nouvelles</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Impact sur l&apos;Immobilier</h4>
                  <p className="text-sm">
                    Ces équipements vont améliorer la qualité de vie et augmenter 
                    l&apos;attractivité des quartiers (+8-12% de plus-value).
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Perspectives 2025-2030
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Prévisions de Croissance</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Évolution des Prix</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Libreville :</strong> +8-12% par an</li>
                      <li>• <strong>Port-Gentil :</strong> +10-15% par an</li>
                      <li>• <strong>Quartiers premium :</strong> +12-18% par an</li>
                      <li>• <strong>Quartiers populaires :</strong> +15-20% par an</li>
                      <li>• <strong>Zones en développement :</strong> +20-25% par an</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Nouveaux Projets</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Smart City :</strong> Quartier connecté</li>
                      <li>• <strong>Éco-quartiers :</strong> Développement durable</li>
                      <li>• <strong>Résidences seniors :</strong> Population vieillissante</li>
                      <li>• <strong>Co-working :</strong> Espaces de travail partagés</li>
                      <li>• <strong>Logements étudiants :</strong> Croissance universitaire</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Opportunités</h4>
                  <p className="text-sm">
                    Le marché gabonais offre un potentiel de croissance exceptionnel 
                    avec des opportunités d&apos;investissement diversifiées.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">Risques et Défis</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Risques Économiques</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Fluctuation pétrole :</strong> Impact sur l&apos;économie</li>
                      <li>• <strong>Inflation :</strong> Hausse des coûts de construction</li>
                      <li>• <strong>Taux d&apos;intérêt :</strong> Impact sur les crédits</li>
                      <li>• <strong>Devise :</strong> Volatilité du FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Risques Immobiliers</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Surproduction :</strong> Risque de bulle</li>
                      <li>• <strong>Qualité construction :</strong> Normes à respecter</li>
                      <li>• <strong>Environnement :</strong> Changement climatique</li>
                      <li>• <strong>Réglementation :</strong> Évolutions législatives</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Recommandations</h4>
                  <p className="text-sm">
                    Diversifier les investissements et privilégier les biens de qualité 
                    avec une forte demande locative pour limiter les risques.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Conclusion : Un Marché Immobilier Dynamique
            </h2>
            
            <p className="mb-4">
              Le marché immobilier gabonais en 2024-2025 se caractérise par une 
              dynamique positive avec de nombreux projets, des investissements massifs 
              et des perspectives de croissance prometteuses.
            </p>
            
            <div className="bg-[#146B67] text-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3"> Restez Informé des Actualités Immobilières</h3>
              <p className="mb-4">
                Suivez nos actualités immobilières en temps réel et découvrez les 
                dernières opportunités d&apos;investissement au Gabon.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href={routes.public.search_property} 
                  className="bg-white text-[#146B67] px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  Voir les Opportunités
                </Link>
                <Link 
                  href={routes.public.guide_immobilier_gabon} 
                  className="border border-white text-white px-6 py-3 rounded-lg hover:bg-white hover:text-[#146B67] transition-colors font-semibold"
                >
                  Guide Complet
                </Link>
              </div>
            </div>
          </section>
        </article>

        {/* Related Articles */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-2xl font-semibold text-[#146B67] mb-6">
                          Articles Similaires
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href={routes.public.blog_rentabilite_immobiliere} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-[#146B67] mb-2">
                  Rentabilité Immobilière Gabon 2024-2025
                </h4>
                <p className="text-sm text-gray-600">
                  Guide complet rentabilité immobilière : ROI, cash-flow, stratégies.
                </p>
              </div>
            </Link>
            
            <Link href={routes.public.guide_immobilier_gabon} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-[#146B67] mb-2">
                  Guide Immobilier Gabon 2024
                </h4>
                <p className="text-sm text-gray-600">
                  Guide complet immobilier Gabon : prix, quartiers, conseils investissement.
                </p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
} 