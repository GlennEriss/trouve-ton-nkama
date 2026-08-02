import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';

export const metadata: Metadata = {
  title: "Guide Quartiers Port-Gentil 2024-2025 - Prix, Ambiance, Services | Trouve Ton Nkama",
  description: "Guide complet quartiers Port-Gentil 2024-2025 : prix par quartier, ambiance, services, écoles, commerces. Matanda, Montagne Sainte, Olowé. Conseils pour choisir son quartier.",
  keywords: "quartiers Port-Gentil 2024, prix immobilier Port-Gentil, Matanda Port-Gentil, Montagne Sainte Port-Gentil, Olowé Port-Gentil, ambiance quartiers Port-Gentil",
};

export default function GuideQuartiersPortGentilPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={routes.public.homePage} className="hover:text-primary">Accueil</Link>
          <span className="mx-2">→</span>
          <Link href={routes.public.blog} className="hover:text-primary">Blog</Link>
          <span className="mx-2">→</span>
          <span className="text-gray-800">Guide Quartiers Port-Gentil 2024-2025</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Guide Complet des Quartiers Port-Gentil 2024-2025 
          </h1>
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span> 12 février 2024</span>
            <span className="mx-2">•</span>
            <span> 20 min de lecture</span>
            <span className="mx-2">•</span>
            <span> Quartiers</span>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Découvrez le guide complet des quartiers de Port-Gentil en 2024-2025 : 
            prix immobiliers, ambiance, services, écoles, commerces et conseils 
            pour choisir votre quartier idéal dans la capitale économique du Gabon.
          </p>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Port-Gentil : La Capitale Économique du Gabon
            </h2>
            
            <p className="mb-4">
              Port-Gentil, capitale économique du Gabon, offre un marché immobilier 
              dynamique avec des prix généralement plus accessibles qu&apos;à Libreville. 
              La ville se caractérise par son activité pétrolière et ses quartiers 
              en pleine expansion.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Caractéristiques du Marché Port-Gentil</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2"> Avantages Prix</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Prix 20-30% inférieurs</strong> à Libreville</li>
                    <li>• <strong>Loyers accessibles</strong> pour tous budgets</li>
                    <li>• <strong>Investissement rentable</strong> avec ROI 8-12%</li>
                    <li>• <strong>Potentiel de plus-value</strong> important</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2"> Développement</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Nouveaux projets</strong> immobiliers</li>
                    <li>• <strong>Infrastructures modernes</strong> en développement</li>
                    <li>• <strong>Activité économique</strong> soutenue</li>
                    <li>• <strong>Population croissante</strong> de travailleurs</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              🏆 Quartiers Premium : Montagne Sainte et Centre-Ville
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">🏔️ Montagne Sainte - Le Quartier Résidentiel de Standing</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Prix Immobiliers 2024-2025</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartement 2 pièces :</strong> 300 000 - 600 000 FCFA/mois</li>
                      <li>• <strong>Maison 3 chambres :</strong> 600 000 - 1 200 000 FCFA/mois</li>
                      <li>• <strong>Villa 4+ chambres :</strong> 1 200 000 - 2 500 000 FCFA/mois</li>
                      <li>• <strong>Achat villa :</strong> 60 - 150 millions FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Vue panoramique :</strong> Sur la ville et l&apos;océan</li>
                      <li>• <strong>Calme et verdure :</strong> Environnement privilégié</li>
                      <li>• <strong>Standing élevé :</strong> Villas modernes, piscines</li>
                      <li>• <strong>Sécurité :</strong> Gardiennage, résidences fermées</li>
                      <li>• <strong>Écoles privées :</strong> Établissements de qualité</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Montagne Sainte est le quartier premium de Port-Gentil avec une rentabilité 
                    locative de 8-10% et une plus-value annuelle de 12-15%.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Centre-Ville - Le Cœur Économique</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Prix Immobiliers 2024-2025</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartement 2 pièces :</strong> 250 000 - 500 000 FCFA/mois</li>
                      <li>• <strong>Maison 3 chambres :</strong> 500 000 - 1 000 000 FCFA/mois</li>
                      <li>• <strong>Villa 4+ chambres :</strong> 1 000 000 - 2 000 000 FCFA/mois</li>
                      <li>• <strong>Achat villa :</strong> 50 - 120 millions FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Centralité :</strong> Proximité services, banques</li>
                      <li>• <strong>Animation :</strong> Restaurants, bars, commerces</li>
                      <li>• <strong>Transport :</strong> Bus, taxis, facilité de déplacement</li>
                      <li>• <strong>Services :</strong> Hôpitaux, administrations</li>
                      <li>• <strong>Potentiel locatif :</strong> Forte demande professionnelle</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Le Centre-Ville est idéal pour l&apos;investissement locatif avec une rentabilité 
                    de 9-12% grâce à la forte demande des travailleurs du secteur pétrolier.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Quartiers Accessibles : Matanda et Olowé
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">👥 Matanda - Le Quartier Populaire et Dynamique</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Prix Immobiliers 2024-2025</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartement 2 pièces :</strong> 100 000 - 200 000 FCFA/mois</li>
                      <li>• <strong>Maison 3 chambres :</strong> 200 000 - 400 000 FCFA/mois</li>
                      <li>• <strong>Villa 4+ chambres :</strong> 400 000 - 800 000 FCFA/mois</li>
                      <li>• <strong>Achat villa :</strong> 25 - 60 millions FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Prix accessibles :</strong> Budget modéré</li>
                      <li>• <strong>Ambiance populaire :</strong> Quartier vivant</li>
                      <li>• <strong>Commerces :</strong> Marchés, boutiques, restaurants</li>
                      <li>• <strong>Transport :</strong> Bus réguliers, taxis</li>
                      <li>• <strong>Potentiel :</strong> Quartier en développement</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Matanda offre un excellent potentiel de plus-value avec une rentabilité 
                    de 10-15% et un quartier en pleine expansion.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Olowé - Le Quartier en Expansion</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Prix Immobiliers 2024-2025</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartement 2 pièces :</strong> 150 000 - 300 000 FCFA/mois</li>
                      <li>• <strong>Maison 3 chambres :</strong> 300 000 - 600 000 FCFA/mois</li>
                      <li>• <strong>Villa 4+ chambres :</strong> 600 000 - 1 200 000 FCFA/mois</li>
                      <li>• <strong>Achat villa :</strong> 35 - 80 millions FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Développement rapide :</strong> Nouveaux projets</li>
                      <li>• <strong>Infrastructures modernes :</strong> Routes, éclairage</li>
                      <li>• <strong>Potentiel investissement :</strong> Plus-value importante</li>
                      <li>• <strong>Services :</strong> Écoles, commerces en développement</li>
                      <li>• <strong>Accessibilité :</strong> Routes principales</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Olowé est le quartier à surveiller avec un potentiel de plus-value 
                    de 15-20% par an grâce au développement des infrastructures.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Quartiers Industriels : Zone Portuaire et Pétrolière
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">⚓ Zone Portuaire - Le Quartier des Travailleurs</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Prix Immobiliers 2024-2025</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartement 2 pièces :</strong> 80 000 - 150 000 FCFA/mois</li>
                      <li>• <strong>Maison 3 chambres :</strong> 150 000 - 300 000 FCFA/mois</li>
                      <li>• <strong>Villa 4+ chambres :</strong> 300 000 - 600 000 FCFA/mois</li>
                      <li>• <strong>Achat villa :</strong> 20 - 40 millions FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Prix attractifs :</strong> Budget très accessible</li>
                      <li>• <strong>Emplois :</strong> Port, industries, pétrole</li>
                      <li>• <strong>Transport :</strong> Proximité port, routes</li>
                      <li>• <strong>Développement :</strong> Zone en expansion</li>
                      <li>• <strong>Potentiel :</strong> Investissement long terme</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    La Zone Portuaire est idéale pour l&apos;investissement long terme avec un potentiel 
                    de plus-value important grâce au développement portuaire.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Comparaison des Quartiers Port-Gentil 2024-2025
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-md">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="p-4 text-left">Quartier</th>
                    <th className="p-4 text-left">Prix 2 pièces</th>
                    <th className="p-4 text-left">Prix 3 chambres</th>
                    <th className="p-4 text-left">Rentabilité</th>
                    <th className="p-4 text-left">Ambiance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Montagne Sainte</td>
                    <td className="p-4">300k-600k FCFA</td>
                    <td className="p-4">600k-1.2M FCFA</td>
                    <td className="p-4">8-10%</td>
                    <td className="p-4">Premium</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-4 font-semibold">Centre-Ville</td>
                    <td className="p-4">250k-500k FCFA</td>
                    <td className="p-4">500k-1M FCFA</td>
                    <td className="p-4">9-12%</td>
                    <td className="p-4">Mixte</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Olowé</td>
                    <td className="p-4">150k-300k FCFA</td>
                    <td className="p-4">300k-600k FCFA</td>
                    <td className="p-4">10-15%</td>
                    <td className="p-4">En développement</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-4 font-semibold">Matanda</td>
                    <td className="p-4">100k-200k FCFA</td>
                    <td className="p-4">200k-400k FCFA</td>
                    <td className="p-4">10-15%</td>
                    <td className="p-4">Populaire</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 font-semibold">Zone Portuaire</td>
                    <td className="p-4">80k-150k FCFA</td>
                    <td className="p-4">150k-300k FCFA</td>
                    <td className="p-4">5-8%</td>
                    <td className="p-4">Industriel</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Conseils pour Choisir Son Quartier à Port-Gentil
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Pour un Budget Modéré</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Matanda :</strong> Prix accessibles, ambiance populaire</li>
                  <li>• <strong>Zone Portuaire :</strong> Prix attractifs, emplois</li>
                  <li>• <strong>Olowé :</strong> Bon rapport qualité-prix</li>
                  <li>• <strong>Conseil :</strong> Privilégier les quartiers en développement</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Pour l&apos;Investissement</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Olowé :</strong> Plus-value importante, développement</li>
                  <li>• <strong>Centre-Ville :</strong> Forte demande locative</li>
                  <li>• <strong>Matanda :</strong> Potentiel de développement</li>
                  <li>• <strong>Conseil :</strong> Diversifier sur plusieurs quartiers</li>
                </ul>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">👨‍👩‍👧‍👦 Pour les Familles</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Montagne Sainte :</strong> Calme, écoles, sécurité</li>
                  <li>• <strong>Centre-Ville :</strong> Services, écoles, commerces</li>
                  <li>• <strong>Olowé :</strong> Développement des services</li>
                  <li>• <strong>Conseil :</strong> Privilégier la proximité des écoles</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">💼 Pour les Professionnels</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Centre-Ville :</strong> Centralité, services</li>
                  <li>• <strong>Montagne Sainte :</strong> Standing, réseaux</li>
                  <li>• <strong>Zone Portuaire :</strong> Proximité travail</li>
                  <li>• <strong>Conseil :</strong> Optimiser le temps de trajet</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Tendances 2024-2025 : Évolution des Quartiers Port-Gentil
            </h2>
            
            <p className="mb-4">
              Le marché immobilier de Port-Gentil connaît une évolution rapide avec 
              le développement économique de la ville. Voici les tendances à surveiller :
            </p>
            
            <div className="space-y-6 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3"> Quartiers en Forte Croissance</h3>
                <ul className="space-y-2">
                  <li>• <strong>Olowé :</strong> +20% de prix en 2024, nouveaux projets</li>
                  <li>• <strong>Matanda :</strong> +15% de prix, développement commercial</li>
                  <li>• <strong>Zone Portuaire :</strong> +25% de prix, développement industriel</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3"> Nouveaux Projets Immobiliers</h3>
                <ul className="space-y-2">
                  <li>• <strong>Olowé :</strong> Résidences modernes, centres commerciaux</li>
                  <li>• <strong>Montagne Sainte :</strong> Villas de luxe, piscines</li>
                  <li>• <strong>Centre-Ville :</strong> Appartements neufs, bureaux</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3"> Évolution des Prix par Quartier</h3>
                <ul className="space-y-2">
                  <li>• <strong>Montagne Sainte :</strong> +10% par an, marché stable</li>
                  <li>• <strong>Centre-Ville :</strong> +12% par an, forte demande</li>
                  <li>• <strong>Olowé :</strong> +20% par an, développement rapide</li>
                  <li>• <strong>Matanda :</strong> +15% par an, popularité croissante</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Conclusion : Trouver Son Quartier Idéal à Port-Gentil
            </h2>
            
            <p className="mb-4">
              Port-Gentil offre des opportunités immobilières uniques avec des prix 
              accessibles et un potentiel de développement important. Choisir son 
              quartier nécessite de considérer budget, style de vie et objectifs d&apos;investissement.
            </p>
            
            <div className="bg-primary text-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3"> Prêt à Trouver Votre Quartier Idéal ?</h3>
              <p className="mb-4">
                Découvrez nos annonces immobilières par quartier et trouvez le logement 
                qui correspond à vos besoins et à votre budget à Port-Gentil.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href={routes.public.search_property} 
                  className="bg-white text-primary px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  Voir les Annonces
                </Link>
                <Link 
                  href={routes.public.guide_immobilier_gabon} 
                  className="border border-white text-white px-6 py-3 rounded-lg hover:bg-white hover:text-primary transition-colors font-semibold"
                >
                  Guide Complet
                </Link>
              </div>
            </div>
          </section>
        </article>

        {/* Related Articles */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-2xl font-semibold text-primary mb-6">
             Articles Similaires
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href={routes.public.blog_guide_quartiers_libreville} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-primary mb-2">
                  Guide Quartiers Libreville 2024-2025
                </h4>
                <p className="text-sm text-gray-600">
                  Guide complet des quartiers de Libreville : prix, ambiance, services.
                </p>
              </div>
            </Link>
            
            <Link href={routes.public.guide_immobilier_gabon} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-primary mb-2">
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