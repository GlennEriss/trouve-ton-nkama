import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';

export const metadata: Metadata = {
  title: "Guide Quartiers Libreville 2024-2025 - Prix, Ambiance, Services | Trouve Ton Nkama",
  description: "Guide complet quartiers Libreville 2024-2025 : prix par quartier, ambiance, services, écoles, commerces. Glass, Akébé, Louis, Nzeng-Ayong, Bellevue, Owendo. Conseils pour choisir son quartier.",
  keywords: "quartiers Libreville 2024, prix immobilier Libreville, Glass Libreville, Akébé Libreville, Louis Libreville, Nzeng-Ayong Libreville, Bellevue Libreville, Owendo Libreville, ambiance quartiers Libreville",
};

export default function GuideQuartiersLibrevillePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={routes.public.homePage} className="hover:text-primary">Accueil</Link>
          <span className="mx-2">→</span>
          <Link href={routes.public.blog} className="hover:text-primary">Blog</Link>
          <span className="mx-2">→</span>
          <span className="text-gray-800">Guide Quartiers Libreville 2024-2025</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Guide Complet des Quartiers Libreville 2024-2025 
          </h1>
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span> 10 février 2024</span>
            <span className="mx-2">•</span>
            <span> 25 min de lecture</span>
            <span className="mx-2">•</span>
            <span> Quartiers</span>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Découvrez le guide complet des quartiers de Libreville en 2024-2025 : 
            prix immobiliers, ambiance, services, écoles, commerces et conseils 
            pour choisir votre quartier idéal dans la capitale gabonaise.
          </p>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Comment Choisir Son Quartier à Libreville ?
            </h2>
            
            <p className="mb-4">
              Choisir son quartier à Libreville est une décision cruciale qui impacte 
              votre qualité de vie, votre budget et votre quotidien. Voici les critères 
              essentiels à considérer :
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Critères Financiers</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Budget immobilier :</strong> Prix d&apos;achat et loyer</li>
                  <li>• <strong>Coût de la vie :</strong> Courses, restaurants, services</li>
                  <li>• <strong>Transport :</strong> Coût des déplacements quotidiens</li>
                  <li>• <strong>Services :</strong> Écoles privées, gardiennage</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Critères Pratiques</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Proximité travail :</strong> Temps de trajet quotidien</li>
                  <li>• <strong>Services essentiels :</strong> Écoles, hôpitaux, commerces</li>
                  <li>• <strong>Sécurité :</strong> Gardiennage, éclairage, police</li>
                  <li>• <strong>Transport :</strong> Bus, taxis, routes accessibles</li>
                </ul>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">👨‍👩‍👧‍👦 Critères Familiaux</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Écoles :</strong> Qualité et proximité</li>
                  <li>• <strong>Activités enfants :</strong> Parcs, clubs sportifs</li>
                  <li>• <strong>Ambiance :</strong> Calme vs animation</li>
                  <li>• <strong>Communauté :</strong> Voisins, associations</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Critères Investissement</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Potentiel de plus-value :</strong> Évolution des prix</li>
                  <li>• <strong>Rentabilité locative :</strong> ROI attendu</li>
                  <li>• <strong>Développement :</strong> Projets futurs</li>
                  <li>• <strong>Liquidité :</strong> Facilité de revente</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              🏆 Quartiers Premium : Glass et Akébé
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Glass - Le Quartier des Expatriés</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Prix Immobiliers 2024-2025</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartement 2 pièces :</strong> 600 000 - 1 200 000 FCFA/mois</li>
                      <li>• <strong>Maison 3 chambres :</strong> 1 200 000 - 2 500 000 FCFA/mois</li>
                      <li>• <strong>Villa 4+ chambres :</strong> 2 500 000 - 5 000 000 FCFA/mois</li>
                      <li>• <strong>Achat villa :</strong> 150 - 500 millions FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Sécurité maximale :</strong> Gardiennage 24h/24</li>
                      <li>• <strong>Standing élevé :</strong> Villas modernes, piscines</li>
                      <li>• <strong>Écoles internationales :</strong> Lycée français, américain</li>
                      <li>• <strong>Commerces de luxe :</strong> Restaurants, boutiques</li>
                      <li>• <strong>Ambiance internationale :</strong> Expatriés, diplomates</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Glass reste le quartier le plus prisé pour l&apos;investissement immobilier 
                    avec une rentabilité locative de 8-12% et une plus-value annuelle de 10-15%.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">🏡 Akébé - Le Quartier Résidentiel Par Excellence</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Prix Immobiliers 2024-2025</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartement 2 pièces :</strong> 400 000 - 800 000 FCFA/mois</li>
                      <li>• <strong>Maison 3 chambres :</strong> 800 000 - 1 500 000 FCFA/mois</li>
                      <li>• <strong>Villa 4+ chambres :</strong> 1 500 000 - 3 000 000 FCFA/mois</li>
                      <li>• <strong>Achat villa :</strong> 80 - 200 millions FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Calme et verdure :</strong> Parcs, jardins</li>
                      <li>• <strong>Écoles de qualité :</strong> Établissements réputés</li>
                      <li>• <strong>Familles nombreuses :</strong> Ambiance familiale</li>
                      <li>• <strong>Services de proximité :</strong> Commerces, pharmacies</li>
                      <li>• <strong>Sécurité :</strong> Quartier résidentiel sécurisé</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Akébé offre un excellent rapport qualité-prix avec une rentabilité 
                    de 6-9% et une stabilité des prix appréciée des investisseurs.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Quartiers Mixtes : Louis et Centre-Ville
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Louis - Le Cœur de Libreville</h3>
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
                      <li>• <strong>Centralité :</strong> Proximité services, administrations</li>
                      <li>• <strong>Animation :</strong> Restaurants, bars, commerces</li>
                      <li>• <strong>Transport :</strong> Bus, taxis, facilité de déplacement</li>
                      <li>• <strong>Services :</strong> Banques, poste, administrations</li>
                      <li>• <strong>Potentiel locatif :</strong> Forte demande locative</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Louis est idéal pour l&apos;investissement locatif avec une rentabilité 
                    de 7-10% grâce à la forte demande des travailleurs et expatriés.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Quartiers Accessibles : Nzeng-Ayong et Bellevue
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">👨‍👩‍👧‍👦 Nzeng-Ayong - Le Quartier des Jeunes Actifs</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Prix Immobiliers 2024-2025</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartement 2 pièces :</strong> 120 000 - 250 000 FCFA/mois</li>
                      <li>• <strong>Maison 3 chambres :</strong> 250 000 - 500 000 FCFA/mois</li>
                      <li>• <strong>Villa 4+ chambres :</strong> 500 000 - 1 000 000 FCFA/mois</li>
                      <li>• <strong>Achat villa :</strong> 30 - 80 millions FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Prix accessibles :</strong> Budget modéré</li>
                      <li>• <strong>Jeunes actifs :</strong> Ambiance dynamique</li>
                      <li>• <strong>Commerces :</strong> Marchés, boutiques</li>
                      <li>• <strong>Transport :</strong> Bus réguliers</li>
                      <li>• <strong>Potentiel :</strong> Quartier en développement</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Nzeng-Ayong offre un excellent potentiel de plus-value avec 
                    une rentabilité de 8-12% et un quartier en pleine expansion.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">🏪 Bellevue - Le Quartier Mixte</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Prix Immobiliers 2024-2025</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Appartement 2 pièces :</strong> 150 000 - 300 000 FCFA/mois</li>
                      <li>• <strong>Maison 3 chambres :</strong> 300 000 - 600 000 FCFA/mois</li>
                      <li>• <strong>Villa 4+ chambres :</strong> 600 000 - 1 200 000 FCFA/mois</li>
                      <li>• <strong>Achat villa :</strong> 40 - 100 millions FCFA</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Bien desservi :</strong> Routes principales</li>
                      <li>• <strong>Ambiance mixte :</strong> Commerces et habitations</li>
                      <li>• <strong>Services :</strong> Écoles, hôpitaux, banques</li>
                      <li>• <strong>Transport :</strong> Accès facile</li>
                      <li>• <strong>Équilibre :</strong> Calme et animation</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Bellevue offre un bon équilibre prix/qualité avec une rentabilité 
                    de 6-9% et une stabilité appréciée des familles.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Quartiers Industriels : Owendo et Port
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Owendo - Le Quartier Portuaire</h3>
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
                      <li>• <strong>Prix attractifs :</strong> Budget accessible</li>
                      <li>• <strong>Emplois :</strong> Port, industries</li>
                      <li>• <strong>Transport :</strong> Route nationale, port</li>
                      <li>• <strong>Développement :</strong> Zone en expansion</li>
                      <li>• <strong>Potentiel :</strong> Investissement long terme</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Investissement</h4>
                  <p className="text-sm">
                    Owendo est idéal pour l&apos;investissement long terme avec un potentiel 
                    de plus-value important grâce au développement portuaire.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Comparaison des Quartiers Libreville 2024-2025
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
                    <td className="p-4 font-semibold">Glass</td>
                    <td className="p-4">600k-1.2M FCFA</td>
                    <td className="p-4">1.2M-2.5M FCFA</td>
                    <td className="p-4">8-12%</td>
                    <td className="p-4">Premium</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-4 font-semibold">Akébé</td>
                    <td className="p-4">400k-800k FCFA</td>
                    <td className="p-4">800k-1.5M FCFA</td>
                    <td className="p-4">6-9%</td>
                    <td className="p-4">Résidentiel</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Louis</td>
                    <td className="p-4">300k-600k FCFA</td>
                    <td className="p-4">600k-1.2M FCFA</td>
                    <td className="p-4">7-10%</td>
                    <td className="p-4">Mixte</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-4 font-semibold">Nzeng-Ayong</td>
                    <td className="p-4">120k-250k FCFA</td>
                    <td className="p-4">250k-500k FCFA</td>
                    <td className="p-4">8-12%</td>
                    <td className="p-4">Populaire</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Bellevue</td>
                    <td className="p-4">150k-300k FCFA</td>
                    <td className="p-4">300k-600k FCFA</td>
                    <td className="p-4">6-9%</td>
                    <td className="p-4">Mixte</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 font-semibold">Owendo</td>
                    <td className="p-4">100k-200k FCFA</td>
                    <td className="p-4">200k-400k FCFA</td>
                    <td className="p-4">5-8%</td>
                    <td className="p-4">Industriel</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Conseils pour Choisir Son Quartier
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Pour un Budget Modéré</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Nzeng-Ayong :</strong> Prix accessibles, ambiance jeune</li>
                  <li>• <strong>Bellevue :</strong> Bon rapport qualité-prix</li>
                  <li>• <strong>Owendo :</strong> Prix attractifs, potentiel futur</li>
                  <li>• <strong>Conseil :</strong> Privilégier les quartiers en développement</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Pour l&apos;Investissement</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Glass :</strong> Plus-value et rentabilité élevées</li>
                  <li>• <strong>Louis :</strong> Forte demande locative</li>
                  <li>• <strong>Nzeng-Ayong :</strong> Potentiel de développement</li>
                  <li>• <strong>Conseil :</strong> Diversifier sur plusieurs quartiers</li>
                </ul>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">👨‍👩‍👧‍👦 Pour les Familles</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Akébé :</strong> Calme, écoles, sécurité</li>
                  <li>• <strong>Glass :</strong> Écoles internationales, standing</li>
                  <li>• <strong>Bellevue :</strong> Équilibre services/calme</li>
                  <li>• <strong>Conseil :</strong> Privilégier la proximité des écoles</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">💼 Pour les Professionnels</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Louis :</strong> Centralité, services</li>
                  <li>• <strong>Glass :</strong> Standing, réseaux</li>
                  <li>• <strong>Centre-ville :</strong> Proximité travail</li>
                  <li>• <strong>Conseil :</strong> Optimiser le temps de trajet</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Tendances 2024-2025 : Évolution des Quartiers
            </h2>
            
            <p className="mb-4">
              Le marché immobilier de Libreville évolue rapidement. Voici les tendances 
              à surveiller pour 2024-2025 :
            </p>
            
            <div className="space-y-6 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3"> Quartiers en Forte Croissance</h3>
                <ul className="space-y-2">
                  <li>• <strong>Nzeng-Ayong :</strong> +15% de prix en 2024, développement commercial</li>
                  <li>• <strong>Owendo :</strong> +20% de prix, développement portuaire</li>
                  <li>• <strong>Bellevue :</strong> +10% de prix, amélioration des services</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3"> Nouveaux Projets Immobiliers</h3>
                <ul className="space-y-2">
                  <li>• <strong>Glass :</strong> Nouvelles villas de luxe, piscines</li>
                  <li>• <strong>Akébé :</strong> Résidences modernes, espaces verts</li>
                  <li>• <strong>Nzeng-Ayong :</strong> Appartements neufs, commerces</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3"> Évolution des Prix par Quartier</h3>
                <ul className="space-y-2">
                  <li>• <strong>Glass :</strong> +8% par an, marché stable</li>
                  <li>• <strong>Akébé :</strong> +6% par an, demande familiale</li>
                  <li>• <strong>Louis :</strong> +10% par an, forte demande locative</li>
                  <li>• <strong>Nzeng-Ayong :</strong> +15% par an, développement rapide</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Conclusion : Trouver Son Quartier Idéal à Libreville
            </h2>
            
            <p className="mb-4">
              Choisir son quartier à Libreville en 2024-2025 nécessite une approche 
              équilibrée entre budget, style de vie et objectifs d&apos;investissement.
            </p>
            
            <div className="bg-primary text-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3"> Prêt à Trouver Votre Quartier Idéal ?</h3>
              <p className="mb-4">
                Découvrez nos annonces immobilières par quartier et trouvez le logement 
                qui correspond à vos besoins et à votre budget.
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
            <Link href={routes.public.blog_tendances_marche} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-primary mb-2">
                  Tendances Marché Immobilier Gabon 2024
                </h4>
                <p className="text-sm text-gray-600">
                  Analyse complète du marché immobilier gabonais et opportunités d&apos;investissement.
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