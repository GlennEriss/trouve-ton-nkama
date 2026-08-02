import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';

export const metadata: Metadata = {
  title: "Rentabilité Immobilière Gabon 2024-2025 : ROI, Investissement, Conseils | Trouve Ton Nkama",
  description: "Guide complet rentabilité immobilière Gabon 2024-2025 : calcul ROI, investissement Libreville, Port-Gentil, conseils experts, analyse marché, plus-values.",
  keywords: "rentabilité immobilière Gabon, ROI immobilier Libreville, investissement immobilier Gabon, plus-value immobilier, calcul rentabilité Gabon",
};

export default function RentabiliteImmobilierePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={routes.public.homePage} className="hover:text-primary">Accueil</Link>
          <span className="mx-2">→</span>
          <Link href={routes.public.blog} className="hover:text-primary">Blog</Link>
          <span className="mx-2">→</span>
          <span className="text-gray-800">Rentabilité Immobilière Gabon 2024-2025</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Rentabilité Immobilière Gabon 2024-2025 : ROI, Cash-Flow, Stratégies 
          </h1>
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span> 15 février 2024</span>
            <span className="mx-2">•</span>
            <span> 30 min de lecture</span>
            <span className="mx-2">•</span>
            <span> Investissement</span>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Découvrez le guide complet de la rentabilité immobilière au Gabon en 2024-2025 : 
            ROI par ville, cash-flow, stratégies d&apos;investissement, plus-value et conseils 
            d&apos;experts pour maximiser vos rendements.
          </p>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Vue d&apos;Ensemble du Marché Immobilier Gabonais 2024-2025
            </h2>
            
            <p className="mb-4">
              Le marché immobilier gabonais offre des opportunités d&apos;investissement 
              attractives avec des rendements compétitifs par rapport aux autres 
              marchés africains. Voici les données clés :
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">8-12%</h3>
                <p className="text-sm text-gray-600">ROI Moyen Annuel</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">10-15%</h3>
                <p className="text-sm text-gray-600">Plus-Value Annuelle</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">6-9%</h3>
                <p className="text-sm text-gray-600">Rentabilité Locative</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Avantages du Marché Gabonais</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2"> Facteurs Économiques</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Stabilité politique</strong> et économique</li>
                    <li>• <strong>Croissance démographique</strong> soutenue (+2.5%/an)</li>
                    <li>• <strong>Déficit de logements</strong> de qualité</li>
                    <li>• <strong>Activité pétrolière</strong> génératrice de revenus</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2"> Facteurs Financiers</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Prix immobiliers</strong> compétitifs</li>
                    <li>• <strong>Rentabilité locative</strong> attractive</li>
                    <li>• <strong>Plus-value</strong> régulière</li>
                    <li>• <strong>Diversification</strong> géographique possible</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               ROI par Ville et Quartier 2024-2025
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Libreville - Capitale Administrative</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Rentabilité par Quartier</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Glass :</strong> ROI 8-12%, plus-value 10-15%</li>
                      <li>• <strong>Akébé :</strong> ROI 6-9%, plus-value 8-12%</li>
                      <li>• <strong>Louis :</strong> ROI 7-10%, plus-value 9-13%</li>
                      <li>• <strong>Nzeng-Ayong :</strong> ROI 8-12%, plus-value 12-18%</li>
                      <li>• <strong>Bellevue :</strong> ROI 6-9%, plus-value 8-11%</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Données Marché</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Prix moyen :</strong> 300k-800k FCFA/mois</li>
                      <li>• <strong>Demande locative :</strong> Très forte</li>
                      <li>• <strong>Liquidité :</strong> Excellente</li>
                      <li>• <strong>Risque :</strong> Faible</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Stratégie Recommandée</h4>
                  <p className="text-sm">
                    Libreville est idéale pour l&apos;investissement locatif avec une forte demande 
                    et une excellente liquidité. Privilégier les quartiers Glass et Louis.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Port-Gentil - Capitale Économique</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Rentabilité par Quartier</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Montagne Sainte :</strong> ROI 8-10%, plus-value 12-15%</li>
                      <li>• <strong>Centre-Ville :</strong> ROI 9-12%, plus-value 10-14%</li>
                      <li>• <strong>Olowé :</strong> ROI 10-15%, plus-value 15-20%</li>
                      <li>• <strong>Matanda :</strong> ROI 10-15%, plus-value 12-18%</li>
                      <li>• <strong>Zone Portuaire :</strong> ROI 5-8%, plus-value 8-12%</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Données Marché</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Prix moyen :</strong> 200k-600k FCFA/mois</li>
                      <li>• <strong>Demande locative :</strong> Forte (secteur pétrolier)</li>
                      <li>• <strong>Liquidité :</strong> Bonne</li>
                      <li>• <strong>Risque :</strong> Faible à moyen</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Stratégie Recommandée</h4>
                  <p className="text-sm">
                    Port-Gentil offre le meilleur potentiel de plus-value avec des prix 
                    accessibles. Privilégier Olowé et Matanda pour le développement.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Calcul du Cash-Flow Immobilier
            </h2>
            
            <p className="mb-4">
              Le cash-flow est l&apos;indicateur clé pour évaluer la rentabilité d&apos;un 
              investissement immobilier. Voici comment le calculer :
            </p>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-xl font-semibold text-primary mb-4"> Formule du Cash-Flow</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3"> Revenus</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>Loyer mensuel :</strong> 400 000 FCFA</li>
                    <li>• <strong>Charges récupérables :</strong> 50 000 FCFA</li>
                    <li>• <strong>Total revenus :</strong> 450 000 FCFA</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">💸 Charges</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>Crédit immobilier :</strong> 300 000 FCFA</li>
                    <li>• <strong>Charges copropriété :</strong> 30 000 FCFA</li>
                    <li>• <strong>Assurance :</strong> 15 000 FCFA</li>
                    <li>• <strong>Taxes foncières :</strong> 10 000 FCFA</li>
                    <li>• <strong>Total charges :</strong> 355 000 FCFA</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-primary mb-2"> Cash-Flow = Revenus - Charges</h4>
                <p className="text-lg font-semibold">
                  Cash-Flow = 450 000 - 355 000 = <span className="text-green-600">95 000 FCFA/mois</span>
                </p>
                <p className="text-sm mt-2">
                  Ce cash-flow positif de 95 000 FCFA/mois représente une rentabilité 
                  de 21% sur les charges (95k/355k).
                </p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Exemple Libreville</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Appartement Glass :</strong> 800k FCFA/mois</li>
                  <li>• <strong>Crédit :</strong> 600k FCFA/mois</li>
                  <li>• <strong>Charges :</strong> 100k FCFA/mois</li>
                  <li>• <strong>Cash-Flow :</strong> +100k FCFA/mois</li>
                  <li>• <strong>ROI :</strong> 10% annuel</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Exemple Port-Gentil</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Appartement Olowé :</strong> 300k FCFA/mois</li>
                  <li>• <strong>Crédit :</strong> 200k FCFA/mois</li>
                  <li>• <strong>Charges :</strong> 50k FCFA/mois</li>
                  <li>• <strong>Cash-Flow :</strong> +50k FCFA/mois</li>
                  <li>• <strong>ROI :</strong> 12% annuel</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Stratégies d&apos;Investissement Immobilier
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Stratégie Cash-Flow</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Revenus réguliers</strong> mensuels</li>
                      <li>• <strong>Remboursement crédit</strong> par le locataire</li>
                      <li>• <strong>Patrimoine qui s&apos;accroît</strong> automatiquement</li>
                      <li>• <strong>Risque modéré</strong> et contrôlé</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Recommandations</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Quartiers :</strong> Louis, Centre-Ville Port-Gentil</li>
                      <li>• <strong>Type :</strong> Appartements 2-3 pièces</li>
                      <li>• <strong>Budget :</strong> 30-80 millions FCFA</li>
                      <li>• <strong>Horizon :</strong> 15-25 ans</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Privilégier les biens avec un cash-flow positif dès l&apos;achat 
                    pour maximiser la rentabilité et sécuriser l&apos;investissement.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Stratégie Plus-Value</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Gains importants</strong> à la revente</li>
                      <li>• <strong>Investissement initial</strong> modéré</li>
                      <li>• <strong>Potentiel élevé</strong> dans les zones en développement</li>
                      <li>• <strong>Flexibilité</strong> de sortie</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Recommandations</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Quartiers :</strong> Nzeng-Ayong, Olowé, Matanda</li>
                      <li>• <strong>Type :</strong> Terrains, maisons anciennes</li>
                      <li>• <strong>Budget :</strong> 20-50 millions FCFA</li>
                      <li>• <strong>Horizon :</strong> 5-10 ans</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Surveiller les projets d&apos;infrastructure et les zones en développement 
                    pour anticiper les plus-values futures.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Stratégie Développement</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Avantages</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Contrôle total</strong> du projet</li>
                      <li>• <strong>Rentabilité maximale</strong> possible</li>
                      <li>• <strong>Création de valeur</strong> ajoutée</li>
                      <li>• <strong>Diversification</strong> des revenus</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Recommandations</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Zones :</strong> Olowé, Nzeng-Ayong, Owendo</li>
                      <li>• <strong>Type :</strong> Terrains constructibles</li>
                      <li>• <strong>Budget :</strong> 50-200 millions FCFA</li>
                      <li>• <strong>Horizon :</strong> 3-7 ans</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Cette stratégie nécessite une expertise technique et financière 
                    importante. Privilégier les partenariats avec des professionnels.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Risques et Points de Vigilance
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">🔍 Risques Financiers</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Fluctuation des taux :</strong> Impact sur les crédits</li>
                  <li>• <strong>Inflation :</strong> Érosion du pouvoir d&apos;achat</li>
                  <li>• <strong>Liquidité :</strong> Difficulté de revente rapide</li>
                  <li>• <strong>Vacance locative :</strong> Perte de revenus</li>
                  <li>• <strong>Coûts imprévus :</strong> Travaux, réparations</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Risques Immobiliers</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Qualité construction :</strong> Vérifier les normes</li>
                  <li>• <strong>Titre foncier :</strong> Authenticité et validité</li>
                  <li>• <strong>Environnement :</strong> Pollution, nuisances</li>
                  <li>• <strong>Évolution du quartier :</strong> Dépréciation possible</li>
                  <li>• <strong>Réglementation :</strong> Changements de lois</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">🛡️ Mesures de Protection</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2"> Protection Financière</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Épargne de sécurité :</strong> 6 mois de charges</li>
                    <li>• <strong>Assurance multirisque :</strong> Couverture complète</li>
                    <li>• <strong>Diversification :</strong> Plusieurs biens/quartiers</li>
                    <li>• <strong>Analyse cash-flow :</strong> Marge de sécurité 20%</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2"> Protection Immobilière</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Expertise technique :</strong> Diagnostic complet</li>
                    <li>• <strong>Vérification légale :</strong> Notaire, avocat</li>
                    <li>• <strong>Étude de marché :</strong> Analyse du quartier</li>
                    <li>• <strong>Contrat de location :</strong> Clauses protectrices</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Tableau Comparatif des Opportunités 2024-2025
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-md">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="p-4 text-left">Ville/Quartier</th>
                    <th className="p-4 text-left">Prix Moyen</th>
                    <th className="p-4 text-left">ROI Annuel</th>
                    <th className="p-4 text-left">Plus-Value</th>
                    <th className="p-4 text-left">Risque</th>
                    <th className="p-4 text-left">Stratégie</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Libreville - Glass</td>
                    <td className="p-4">800k FCFA</td>
                    <td className="p-4">8-12%</td>
                    <td className="p-4">10-15%</td>
                    <td className="p-4">Faible</td>
                    <td className="p-4">Cash-Flow</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-4 font-semibold">Libreville - Louis</td>
                    <td className="p-4">400k FCFA</td>
                    <td className="p-4">7-10%</td>
                    <td className="p-4">9-13%</td>
                    <td className="p-4">Faible</td>
                    <td className="p-4">Cash-Flow</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Libreville - Nzeng-Ayong</td>
                    <td className="p-4">200k FCFA</td>
                    <td className="p-4">8-12%</td>
                    <td className="p-4">12-18%</td>
                    <td className="p-4">Moyen</td>
                    <td className="p-4">Plus-Value</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-4 font-semibold">Port-Gentil - Olowé</td>
                    <td className="p-4">300k FCFA</td>
                    <td className="p-4">10-15%</td>
                    <td className="p-4">15-20%</td>
                    <td className="p-4">Moyen</td>
                    <td className="p-4">Plus-Value</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Port-Gentil - Centre</td>
                    <td className="p-4">400k FCFA</td>
                    <td className="p-4">9-12%</td>
                    <td className="p-4">10-14%</td>
                    <td className="p-4">Faible</td>
                    <td className="p-4">Cash-Flow</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 font-semibold">Port-Gentil - Matanda</td>
                    <td className="p-4">150k FCFA</td>
                    <td className="p-4">10-15%</td>
                    <td className="p-4">12-18%</td>
                    <td className="p-4">Moyen</td>
                    <td className="p-4">Plus-Value</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Plan d&apos;Action pour Investir en 2024-2025
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Étapes Préparatoires</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li><strong>Définir ses objectifs :</strong> Cash-flow vs plus-value, horizon temporel</li>
                  <li><strong>Évaluer sa capacité financière :</strong> Apport, capacité d&apos;emprunt</li>
                  <li><strong>Choisir sa stratégie :</strong> Locatif, plus-value, développement</li>
                  <li><strong>Sélectionner les zones :</strong> Libreville vs Port-Gentil</li>
                  <li><strong>Préparer la documentation :</strong> Justificatifs, garanties</li>
                </ol>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">🔍 Phase de Recherche</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li><strong>Étudier le marché :</strong> Prix, tendances, quartiers</li>
                  <li><strong>Analyser les opportunités :</strong> Visites, comparatifs</li>
                  <li><strong>Vérifier la légalité :</strong> Titre foncier, urbanisme</li>
                  <li><strong>Calculer la rentabilité :</strong> ROI, cash-flow, plus-value</li>
                  <li><strong>Négocier le prix :</strong> Marge de négociation 10-20%</li>
                </ol>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Phase d&apos;Investissement</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li><strong>Finaliser l&apos;achat :</strong> Acte notarié, enregistrement</li>
                  <li><strong>Obtenir le financement :</strong> Crédit immobilier, conditions</li>
                  <li><strong>Assurer le bien :</strong> Multirisque, responsabilité civile</li>
                  <li><strong>Préparer la location :</strong> État des lieux, contrat</li>
                  <li><strong>Gérer l&apos;investissement :</strong> Suivi, optimisation</li>
                </ol>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Conclusion : Maximiser sa Rentabilité Immobilière
            </h2>
            
            <p className="mb-4">
              L&apos;investissement immobilier au Gabon offre des opportunités uniques 
              avec des rendements attractifs. La clé du succès réside dans une approche 
              méthodique et une diversification géographique.
            </p>
            
            <div className="bg-primary text-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3"> Prêt à Investir dans l&apos;Immobilier Gabonais ?</h3>
              <p className="mb-4">
                Découvrez nos opportunités d&apos;investissement et trouvez le bien 
                qui correspond à vos objectifs financiers et à votre stratégie.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href={routes.public.search_property} 
                  className="bg-white text-primary px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  Voir les Opportunités
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