import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';

export const metadata: Metadata = {
  title: "Tendances du Marché Immobilier au Gabon 2024 - Analyse Complète | Trouve Ton Nkama",
  description: "Analyse complète du marché immobilier gabonais 2024 : croissance Libreville, Port-Gentil, projet Libreville 2, logements sociaux. Conseils experts pour investir au Gabon.",
  keywords: "marché immobilier Gabon 2024, tendances immobilier Libreville, Port-Gentil immobilier, investissement immobilier Gabon, prix immobilier Libreville, projet Libreville 2",
};

export default function TendancesMarchePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={routes.public.homePage} className="hover:text-[#146B67]">Accueil</Link>
          <span className="mx-2">→</span>
          <Link href={routes.public.blog} className="hover:text-[#146B67]">Blog</Link>
          <span className="mx-2">→</span>
          <span className="text-gray-800">Tendances Marché Immobilier Gabon 2024</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[#146B67] mb-4">
            Tendances du Marché Immobilier au Gabon 2024 🇬🇦
          </h1>
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span> 15 janvier 2024</span>
            <span className="mx-2">•</span>
            <span> 12 min de lecture</span>
            <span className="mx-2">•</span>
            <span> Marché immobilier</span>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Le marché immobilier gabonais connaît une transformation majeure en 2024. 
            Entre la croissance de Libreville, le dynamisme de Port-Gentil et les nouveaux 
            projets gouvernementaux, découvrez les opportunités et défis du secteur immobilier au Gabon.
          </p>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Libreville : Le Pôle Immobilier en Pleine Expansion
            </h2>
            
            <p className="mb-4">
              Libreville, capitale économique du Gabon, continue d&apos;attirer les investisseurs 
              immobiliers avec une croissance soutenue du secteur. Les quartiers comme 
              <strong>Glass, Akébé et Louis</strong> connaissent une forte demande locative.
            </p>
            
            <div className="bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9] p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Chiffres Clés Libreville 2024</h3>
              <ul className="space-y-2">
                <li><strong>Prix moyen location :</strong> 350 000 - 800 000 FCFA/mois</li>
                <li><strong>Croissance des prix :</strong> +8% par an en moyenne</li>
                <li><strong>Demande locative :</strong> +15% vs 2023</li>
                <li><strong>Nouveaux projets :</strong> 2000 logements en construction</li>
              </ul>
            </div>
            
            <p className="mb-4">
              Le <strong>projet "Libreville 2"</strong> annoncé par le gouvernement gabonais 
              devrait révolutionner le marché avec 6000 logements sociaux d&apos;ici 2026, 
              créant de nouvelles opportunités d&apos;investissement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Port-Gentil : Le Dynamisme Pétrolier au Service de l'Immobilier
            </h2>
            
                        <p className="mb-4">
              Port-Gentil, capitale économique du pétrole, bénéficie d&apos;un marché immobilier
              dynamique grâce à la présence d&apos;entreprises internationales et d&apos;expatriés.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2"> Secteur Pétrolier</h4>
                <ul className="text-sm space-y-1">
                  <li>• Logements haut de gamme</li>
                  <li>• Prix 20-30% plus élevés</li>
                  <li>• Demande expatriés forte</li>
                  <li>• Contrats courts terme</li>
                </ul>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2"> Secteur Résidentiel</h4>
                <ul className="text-sm space-y-1">
                  <li>• Quartiers populaires</li>
                  <li>• Prix accessibles</li>
                  <li>• Familles locales</li>
                  <li>• Contrats long terme</li>
                </ul>
              </div>
            </div>
            
            <p className="mb-4">
              Les prix à Port-Gentil varient considérablement selon les quartiers, 
              avec des <strong>appartements de 2 pièces</strong> allant de 120 000 à 400 000 FCFA/mois 
              selon la localisation et le standing.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Projet Libreville 2 : L'Initiative Gouvernementale Révolutionnaire
            </h2>
            
            <p className="mb-4">
              Le gouvernement gabonais a lancé le <strong>projet "Libreville 2"</strong>, 
              une initiative ambitieuse visant à résoudre la crise du logement et stimuler 
              l'investissement immobilier.
            </p>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-xl font-semibold mb-4"> Objectifs du Projet Libreville 2</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-[#146B67] mb-2"> Chiffres Clés</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• 6000 logements sociaux</li>
                    <li>• Livraison d'ici 2026</li>
                    <li>• Partenariats Public-Privé</li>
                    <li>• Prix accessibles</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[#146B67] mb-2"> Types de Logements</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Appartements 2-3 pièces</li>
                    <li>• Maisons individuelles</li>
                    <li>• Équipements collectifs</li>
                    <li>• Zones commerciales</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <p className="mb-4">
              Ce projet devrait créer de nouvelles opportunités d'investissement et 
              stabiliser les prix du marché immobilier gabonais.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Défis Actuels du Marché Immobilier Gabonais
            </h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-semibold text-red-700 mb-2"> Accès au Financement Limité</h3>
                <p className="text-gray-700">
                  Le crédit immobilier reste très limité au Gabon avec des durées courtes 
                  (5-7 ans) et des taux élevés (8-12%), freinant l'accession à la propriété.
                </p>
              </div>
              
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold text-orange-700 mb-2"> Rentabilité Locative Limitée</h3>
                <p className="text-gray-700">
                  Les rendements locatifs oscillent entre 4-6% en moyenne, 
                  nécessitant des stratégies d'investissement optimisées.
                </p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-semibold text-yellow-700 mb-2"> Infrastructure en Développement</h3>
                <p className="text-gray-700">
                  Certains quartiers manquent encore d'infrastructures de base, 
                  impactant la valeur immobilière et l'attractivité.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Recommandations pour Investisseurs et Propriétaires
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Pour les Investisseurs</h3>
                <ul className="space-y-3">
                  <li> <strong>Diversifiez</strong> : Libreville + Port-Gentil</li>
                  <li> <strong>Privilégiez</strong> les quartiers en développement</li>
                  <li> <strong>Anticipez</strong> le projet Libreville 2</li>
                  <li> <strong>Optimisez</strong> la gestion locative</li>
                  <li> <strong>Surveillez</strong> les opportunités PPP</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Pour les Propriétaires</h3>
                <ul className="space-y-3">
                  <li> <strong>Améliorez</strong> la qualité des logements</li>
                  <li> <strong>Adaptez</strong> les prix au marché local</li>
                  <li> <strong>Développez</strong> une présence en ligne</li>
                  <li> <strong>Proposez</strong> des services additionnels</li>
                  <li> <strong>Participez</strong> aux programmes gouvernementaux</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Perspectives 2024-2025
            </h2>
            
            <p className="mb-4">
              Le marché immobilier gabonais devrait connaître une <strong>croissance modérée</strong> 
              en 2024-2025, portée par :
            </p>
            
            <ul className="space-y-2 mb-6">
              <li> <strong>L'expansion du projet Libreville 2</strong></li>
              <li> <strong>La stabilisation du secteur pétrolier</strong></li>
              <li> <strong>L'amélioration des infrastructures</strong></li>
              <li>💼 <strong>L'arrivée de nouvelles entreprises</strong></li>
              <li> <strong>Le développement du crédit immobilier</strong></li>
            </ul>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3"> Prévisions de Croissance</h3>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">+6%</div>
                  <div className="text-sm text-gray-600">Prix immobilier</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">+12%</div>
                  <div className="text-sm text-gray-600">Volume transactions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">+8%</div>
                  <div className="text-sm text-gray-600">Demande locative</div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Conclusion : Opportunités à Saisir
            </h2>
            
            <p className="mb-4">
              Le marché immobilier gabonais présente de <strong>réelles opportunités</strong> 
              pour les investisseurs avertis. La combinaison de la croissance économique, 
              des projets gouvernementaux et du développement urbain crée un environnement 
              favorable à l&apos;investissement immobilier.
            </p>
            
            <p className="mb-6">
              <strong>Trouve Ton Nkama</strong> vous accompagne dans vos projets immobiliers 
              au Gabon avec des annonces vérifiées, des conseils experts et une plateforme 
              optimisée pour le marché local.
            </p>
            
            <div className="bg-[#146B67] text-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3"> Prêt à Investir au Gabon ?</h3>
              <p className="mb-4">
                Découvrez nos annonces immobilières vérifiées et trouvez l&apos;opportunité 
                d&apos;investissement qui vous correspond.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href={routes.public.search_property} 
                  className="bg-white text-[#146B67] px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  Voir les Annonces
                </Link>
                <Link 
                  href={routes.public.property} 
                  className="border border-white text-white px-6 py-3 rounded-lg hover:bg-white hover:text-[#146B67] transition-colors font-semibold"
                >
                  Publier une Annonce
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