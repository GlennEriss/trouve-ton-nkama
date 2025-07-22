import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';

export const metadata: Metadata = {
  title: "Financement Immobilier au Gabon : État des Lieux et Solutions 2024 | Trouve Ton Nkama",
  description: "Guide complet financement immobilier Gabon : crédit immobilier, refinancement hypothécaire, micro-crédit, épargne. Solutions pour financer son logement au Gabon.",
  keywords: "financement immobilier Gabon, crédit immobilier Libreville, micro-crédit Gabon, refinancement hypothécaire, épargne immobilier Gabon, banques Gabon",
};

export default function FinancementImmobilierPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={routes.public.homePage} className="hover:text-[#146B67]">Accueil</Link>
          <span className="mx-2">→</span>
          <Link href="/blog" className="hover:text-[#146B67]">Blog</Link>
          <span className="mx-2">→</span>
          <span className="text-gray-800">Financement Immobilier Gabon 2024</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[#146B67] mb-4">
            Financement Immobilier au Gabon : État des Lieux et Solutions 2024 
          </h1>
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span> 20 janvier 2024</span>
            <span className="mx-2">•</span>
            <span> 15 min de lecture</span>
            <span className="mx-2">•</span>
            <span> Financement immobilier</span>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Le financement immobilier au Gabon fait face à des défis majeurs en 2024. 
            Entre crédit immobilier limité, refinancement hypothécaire et nouvelles solutions, 
            découvrez comment financer votre projet immobilier au Gabon.
          </p>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               État Actuel du Crédit Immobilier au Gabon
            </h2>
            
            <p className="mb-4">
              Le <strong>crédit immobilier au Gabon</strong> reste très limité comparé aux standards 
              internationaux. Les banques gabonaises proposent des solutions restrictives qui 
              freinent l'accession à la propriété.
            </p>
            
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Contraintes Actuelles</h3>
              <ul className="space-y-2">
                <li><strong>Durées courtes :</strong> 5-7 ans maximum (vs 20-25 ans ailleurs)</li>
                <li><strong>Taux élevés :</strong> 8-12% annuel</li>
                <li><strong>Apport important :</strong> 30-50% du bien</li>
                <li><strong>Garanties strictes :</strong> Hypothèque + caution</li>
                <li><strong>Revenus stables :</strong> CDI obligatoire</li>
              </ul>
            </div>
            
            <p className="mb-4">
              Ces conditions rendent l&apos;accession à la propriété difficile pour la majorité 
              des Gabonais, créant un <strong>déficit de logements</strong> estimé à 100 000 unités.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Banques Principales et Leurs Offres
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> BGFI (Banque Gabonaise et Française Internationale)</h3>
                <ul className="space-y-2 text-sm">
                  <li><strong>Durée :</strong> 5-7 ans</li>
                  <li><strong>Taux :</strong> 9-11%</li>
                  <li><strong>Apport :</strong> 30% minimum</li>
                  <li><strong>Montant max :</strong> 50 millions FCFA</li>
                  <li><strong>Conditions :</strong> CDI + 2 ans d&apos;ancienneté</li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> AFG Bank (ex-BICIG)</h3>
                <ul className="space-y-2 text-sm">
                  <li><strong>Durée :</strong> 5-8 ans</li>
                  <li><strong>Taux :</strong> 8-10%</li>
                  <li><strong>Apport :</strong> 25% minimum</li>
                  <li><strong>Montant max :</strong> 75 millions FCFA</li>
                  <li><strong>Conditions :</strong> Revenus stables</li>
                </ul>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> UBA Gabon</h3>
                <ul className="space-y-2 text-sm">
                  <li><strong>Durée :</strong> 6-10 ans</li>
                  <li><strong>Taux :</strong> 10-12%</li>
                  <li><strong>Apport :</strong> 35% minimum</li>
                  <li><strong>Montant max :</strong> 60 millions FCFA</li>
                  <li><strong>Conditions :</strong> Garanties multiples</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Ecobank Gabon</h3>
                <ul className="space-y-2 text-sm">
                  <li><strong>Durée :</strong> 5-7 ans</li>
                  <li><strong>Taux :</strong> 9-11%</li>
                  <li><strong>Apport :</strong> 30% minimum</li>
                  <li><strong>Montant max :</strong> 40 millions FCFA</li>
                  <li><strong>Conditions :</strong> Client premium</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              🔄 Refinancement Hypothécaire : Une Solution Émergente
            </h2>
            
            <p className="mb-4">
              Le <strong>refinancement hypothécaire</strong> apparaît comme une solution 
              prometteuse pour dynamiser le marché immobilier gabonais. Cette approche 
              permet de libérer la valeur du patrimoine immobilier existant.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Avantages du Refinancement Hypothécaire</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-[#146B67] mb-2"> Pour les Propriétaires</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Libération de liquidités</li>
                    <li>• Amélioration du logement</li>
                    <li>• Investissement immobilier</li>
                    <li>• Consolidation de dettes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[#146B67] mb-2"> Pour les Banques</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Garanties immobilières</li>
                    <li>• Risques réduits</li>
                    <li>• Nouveaux produits</li>
                    <li>• Croissance du marché</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <p className="mb-4">
              Les <strong>tables rondes sur le refinancement hypothécaire</strong> organisées 
              par le gouvernement gabonais montrent l&apos;engagement des autorités pour 
              développer cette solution.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Solutions Alternatives de Financement
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-3"> Micro-Crédit Immobilier</h3>
                <p className="mb-3">
                  Le micro-crédit immobilier émerge comme une solution adaptée aux 
                  revenus modestes au Gabon.
                </p>
                <ul className="space-y-1 text-sm">
                  <li><strong>Montants :</strong> 2-10 millions FCFA</li>
                  <li><strong>Durée :</strong> 3-5 ans</li>
                  <li><strong>Taux :</strong> 12-15%</li>
                  <li><strong>Garanties :</strong> Simplifiées</li>
                  <li><strong>Organismes :</strong> IMF locales</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-3"> Épargne et Auto-Financement</h3>
                <p className="mb-3">
                  L&apos;épargne reste la méthode principale de financement immobilier au Gabon.
                </p>
                <ul className="space-y-1 text-sm">
                  <li><strong>Épargne traditionnelle :</strong> Comptes bancaires</li>
                  <li><strong>Tontines :</strong> Système d&apos;épargne communautaire</li>
                  <li><strong>Investissement locatif :</strong> Revenus complémentaires</li>
                  <li><strong>Héritage :</strong> Transmission familiale</li>
                  <li><strong>Épargne salariale :</strong> Plans d&apos;entreprise</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-3">🤝 Partenariats Public-Privé (PPP)</h3>
                <p className="mb-3">
                  Les PPP se développent pour financer les logements sociaux au Gabon.
                </p>
                <ul className="space-y-1 text-sm">
                  <li><strong>Projet Libreville 2 :</strong> 6000 logements</li>
                  <li><strong>Financement mixte :</strong> Public + Privé</li>
                  <li><strong>Prix accessibles :</strong> 15-25 millions FCFA</li>
                  <li><strong>Conditions :</strong> Critères sociaux</li>
                  <li><strong>Livraison :</strong> 2024-2026</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Comparaison des Solutions de Financement
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-[#146B67] text-white">
                    <th className="border border-gray-300 p-3 text-left">Solution</th>
                    <th className="border border-gray-300 p-3 text-left">Montant</th>
                    <th className="border border-gray-300 p-3 text-left">Durée</th>
                    <th className="border border-gray-300 p-3 text-left">Taux</th>
                    <th className="border border-gray-300 p-3 text-left">Apport</th>
                    <th className="border border-gray-300 p-3 text-left">Accessibilité</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 p-3 font-semibold">Crédit Bancaire</td>
                    <td className="border border-gray-300 p-3">20-75M FCFA</td>
                    <td className="border border-gray-300 p-3">5-8 ans</td>
                    <td className="border border-gray-300 p-3">8-12%</td>
                    <td className="border border-gray-300 p-3">25-35%</td>
                    <td className="border border-gray-300 p-3">⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold">Micro-Crédit</td>
                    <td className="border border-gray-300 p-3">2-10M FCFA</td>
                    <td className="border border-gray-300 p-3">3-5 ans</td>
                    <td className="border border-gray-300 p-3">12-15%</td>
                    <td className="border border-gray-300 p-3">10-20%</td>
                    <td className="border border-gray-300 p-3">⭐⭐⭐⭐</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 p-3 font-semibold">Épargne</td>
                    <td className="border border-gray-300 p-3">Illimité</td>
                    <td className="border border-gray-300 p-3">Variable</td>
                    <td className="border border-gray-300 p-3">0%</td>
                    <td className="border border-gray-300 p-3">100%</td>
                    <td className="border border-gray-300 p-3">⭐⭐⭐⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold">PPP Logement</td>
                    <td className="border border-gray-300 p-3">15-25M FCFA</td>
                    <td className="border border-gray-300 p-3">15-20 ans</td>
                    <td className="border border-gray-300 p-3">5-7%</td>
                    <td className="border border-gray-300 p-3">10-15%</td>
                    <td className="border border-gray-300 p-3">⭐⭐⭐</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Conseils pour Optimiser Votre Financement
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Préparation du Dossier</h3>
                <ul className="space-y-3">
                  <li> <strong>Épargnez</strong> au moins 30% du bien</li>
                  <li> <strong>Stabilisez</strong> vos revenus (CDI)</li>
                  <li> <strong>Préparez</strong> tous les justificatifs</li>
                  <li> <strong>Comparez</strong> les offres bancaires</li>
                  <li> <strong>Négociez</strong> les conditions</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Stratégies Bancaires</h3>
                <ul className="space-y-3">
                  <li> <strong>Développez</strong> une relation bancaire</li>
                  <li> <strong>Diversifiez</strong> vos comptes</li>
                  <li> <strong>Épargnez</strong> régulièrement</li>
                  <li> <strong>Évitez</strong> les incidents bancaires</li>
                  <li> <strong>Anticipez</strong> les besoins futurs</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Évolutions Futures du Financement Immobilier
            </h2>
            
            <p className="mb-4">
              Le secteur du financement immobilier au Gabon devrait connaître des 
              évolutions importantes dans les prochaines années :
            </p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-green-700 mb-2"> Développement du Crédit Immobilier</h3>
                <p className="text-gray-700">
                  Les banques devraient proposer des durées plus longues (15-20 ans) 
                  et des taux plus compétitifs pour stimuler le marché.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-blue-700 mb-2">🤝 Expansion des PPP</h3>
                <p className="text-gray-700">
                  Les partenariats public-privé devraient se multiplier pour 
                  financer les logements sociaux et accessibles.
                </p>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-purple-700 mb-2">💻 Innovation Fintech</h3>
                <p className="text-gray-700">
                  Les solutions digitales et la fintech devraient faciliter 
                  l'accès au financement immobilier.
                </p>
              </div>
              
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold text-orange-700 mb-2"> Régulation Gouvernementale</h3>
                <p className="text-gray-700">
                  Le gouvernement devrait mettre en place des incitations fiscales 
                  et des garanties pour faciliter l'accession à la propriété.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Conclusion : Choisir la Bonne Solution
            </h2>
            
            <p className="mb-4">
              Le financement immobilier au Gabon présente des défis mais aussi des 
              opportunités. La clé du succès réside dans une <strong>approche diversifiée</strong> 
              combinant plusieurs solutions selon votre situation.
            </p>
            
            <div className="bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9] p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-4"> Recommandations par Profil</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-[#146B67] mb-2">👨‍💼 Salarié CDI</h4>
                  <p className="text-sm">Crédit bancaire + épargne</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[#146B67] mb-2">👨‍💻 Entrepreneur</h4>
                  <p className="text-sm">Micro-crédit + épargne</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[#146B67] mb-2">👨‍👩‍👧‍👦 Famille Modeste</h4>
                  <p className="text-sm">PPP + épargne communautaire</p>
                </div>
              </div>
            </div>
            
            <p className="mb-6">
              <strong>Trouve Ton Nkama</strong> vous accompagne dans votre projet immobilier 
              au Gabon avec des conseils personnalisés et des annonces adaptées à votre budget.
            </p>
            
            <div className="bg-[#146B67] text-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3"> Prêt à Financer Votre Projet ?</h3>
              <p className="mb-4">
                Découvrez nos annonces immobilières et trouvez le bien qui correspond 
                à votre budget et à vos possibilités de financement.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href={routes.public.search_property} 
                  className="bg-white text-[#146B67] px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  Voir les Annonces
                </Link>
                <Link 
                  href={routes.public.guide_immobilier_gabon} 
                  className="border border-white text-white px-6 py-3 rounded-lg hover:bg-white hover:text-[#146B67] transition-colors font-semibold"
                >
                  Guide Immobilier
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
            <Link href={routes.public.blog_commissions_demarcheurs} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-[#146B67] mb-2">
                  Commissions Démarcheurs Logements Gabon
                </h4>
                <p className="text-sm text-gray-600">
                  Découvrez les problèmes des commissions élevées et les solutions alternatives pour éviter les frais excessifs.
                </p>
              </div>
            </Link>
            
            <Link href={routes.public.blog_guide_quartiers_libreville} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-[#146B67] mb-2">
                  Guide Quartiers Libreville 2024-2025
                </h4>
                <p className="text-sm text-gray-600">
                  Guide complet des quartiers de Libreville : prix, ambiance, services et conseils d'investissement.
                </p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
} 