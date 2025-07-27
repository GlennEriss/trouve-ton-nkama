import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';

export const metadata: Metadata = {
  title: "Comment Structurer Vos Annonces pour Maximiser l'Engagement | Trouve Ton Nkama",
  description: "Guide complet pour structurer vos annonces immobilières au Gabon : titres accrocheurs, descriptions optimisées, photos professionnelles, CTAs efficaces. Maximisez votre engagement.",
  keywords: "structurer annonces immobilier Gabon, titres accrocheurs, descriptions optimisées, photos professionnelles, engagement annonces, marketing immobilier Gabon",
};

export default function StructurerAnnoncesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={routes.public.homePage} className="hover:text-[#146B67]">Accueil</Link>
          <span className="mx-2">→</span>
          <Link href={routes.public.blog} className="hover:text-[#146B67]">Blog</Link>
          <span className="mx-2">→</span>
          <span className="text-gray-800">Structurer Vos Annonces Immobilières</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[#146B67] mb-4">
            Comment Structurer Vos Annonces pour Maximiser l&apos;Engagement 📝
          </h1>
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span> 30 janvier 2024</span>
            <span className="mx-2">•</span>
            <span> 15 min de lecture</span>
            <span className="mx-2">•</span>
            <span> Marketing immobilier</span>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Une annonce immobilière bien structurée peut faire la différence entre 
            un bien qui se vend rapidement et un bien qui reste en ligne des mois. 
            Découvrez les techniques pour maximiser l&apos;engagement de vos annonces au Gabon.
          </p>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               L&apos;Importance d&apos;une Annonce Bien Structurée
            </h2>
            
            <p className="mb-4">
              Au Gabon, la concurrence immobilière s&apos;intensifie. Une annonce 
              mal structurée peut coûter cher en opportunités manquées. Voici pourquoi 
              la structure de votre annonce est cruciale :
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Impact d&apos;une Bonne Structure</h3>
              <ul className="space-y-2">
                <li><strong>+300%</strong> de clics sur les annonces optimisées</li>
                <li><strong>+45%</strong> de contacts générés</li>
                <li><strong>+60%</strong> de temps passé sur l&apos;annonce</li>
                <li><strong>+25%</strong> de taux de conversion</li>
              </ul>
            </div>
            
            <p className="mb-4">
              <strong>Conseil :</strong> Les acheteurs et locataires au Gabon passent en moyenne 
              2-3 minutes sur une annonce avant de décider de contacter ou non.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              ✨ Titres Accrocheurs : L&apos;Art de Capturer l&apos;Attention
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">❌ Exemples à Éviter</h3>
                <ul className="space-y-2 text-sm">
                  <li>• "Maison à vendre"</li>
                  <li>• "Appartement Libreville"</li>
                  <li>• "Villa 3 chambres"</li>
                  <li>• "Terrain disponible"</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Exemples Optimisés</h3>
                <ul className="space-y-2 text-sm">
                  <li>• "Villa sous barrière Glass - 4 chambres - Piscine"</li>
                  <li>• "Appartement centre-ville Libreville - Vue mer - 3 chambres"</li>
                  <li>• "Terrain constructible Akébé - 500m² - Viabilisé"</li>
                  <li>• "Maison moderne Port-Gentil - Jardin paysager - Garage"</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Formule Magique du Titre</h3>
              <p className="mb-3">
                <strong>Type de bien + Localisation + Caractéristique principale + Avantage unique</strong>
              </p>
              <p className="text-sm text-gray-600">
                Exemple : "Villa sous barrière Glass - 4 chambres - Piscine privée"
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              📝 Description Optimisée : Raconter l&apos;Histoire de Votre Bien
            </h2>
            
            <p className="mb-4">
              Une description efficace doit être structurée, informative et émotionnelle. 
              Voici la structure recommandée :
            </p>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">1. Accroche (2-3 phrases)</h3>
                <p className="text-sm text-gray-700">
                  "Découvrez cette villa exceptionnelle dans le quartier résidentiel de Glass. 
                  Idéalement située à 5 minutes du centre-ville, cette propriété allie 
                  confort moderne et authenticité gabonaise."
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">2. Caractéristiques Techniques</h3>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Surface :</strong> 200m² habitable + 100m² terrasse</li>
                  <li>• <strong>Chambres :</strong> 4 chambres avec dressing</li>
                  <li>• <strong>Salles de bain :</strong> 3 salles de bain complètes</li>
                  <li>• <strong>Garage :</strong> 2 places couvertes</li>
                  <li>• <strong>Jardin :</strong> 500m² paysager avec piscine</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">3. Avantages et Points Forts</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Quartier sécurisé avec gardiennage 24h/24</li>
                  <li>• Écoles internationales à proximité</li>
                  <li>• Commerces et services à 5 minutes</li>
                  <li>• Transport en commun facile</li>
                  <li>• Vue dégagée sur la ville</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">4. Call-to-Action (CTA)</h3>
                <p className="text-sm text-gray-700">
                  "Visite possible dès cette semaine. Contactez-nous pour organiser 
                  une visite privée et découvrir tous les détails de cette propriété exceptionnelle."
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              📸 Galerie Photo : L&apos;Impact Visuel
            </h2>
            
            <p className="mb-4">
              Les photos représentent 70% de l&apos;impact d&apos;une annonce. Voici comment 
              optimiser votre galerie photo :
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">📱 Ordre des Photos</h3>
                <ol className="space-y-2 text-sm">
                  <li><strong>1. Photo principale :</strong> Vue extérieure attractive</li>
                  <li><strong>2. Salon/Séjour :</strong> Pièce de vie principale</li>
                  <li><strong>3. Cuisine :</strong> Équipements et espace</li>
                  <li><strong>4. Chambres :</strong> Une par chambre</li>
                  <li><strong>5. Salles de bain :</strong> État et équipements</li>
                  <li><strong>6. Extérieurs :</strong> Jardin, terrasse, garage</li>
                  <li><strong>7. Détails :</strong> Équipements, finitions</li>
                </ol>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Conseils Photo</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Lumière naturelle :</strong> Photos en journée</li>
                  <li>• <strong>Angles larges :</strong> Montrer l&apos;espace</li>
                  <li>• <strong>Propreté :</strong> Bien rangé et propre</li>
                  <li>• <strong>Qualité :</strong> Photos haute résolution</li>
                  <li>• <strong>Quantité :</strong> 10-15 photos minimum</li>
                  <li>• <strong>Alt text :</strong> Descriptions pour SEO</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-red-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3">❌ Erreurs Fréquentes</h3>
              <ul className="space-y-2">
                <li>• Photos floues ou sombres</li>
                <li>• Pièces en désordre</li>
                <li>• Trop peu de photos (moins de 5)</li>
                <li>• Photos de mauvaise qualité</li>
                <li>• Absence de photos extérieures</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Call-to-Action (CTA) : Convertir l&apos;Intérêt en Action
            </h2>
            
            <p className="mb-4">
              Un CTA efficace transforme un visiteur en prospect. Voici les meilleures 
              pratiques pour le marché gabonais :
            </p>
            
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-md text-center">
                <h4 className="font-semibold text-[#146B67] mb-2">📞 Contact Direct</h4>
                <p className="text-sm text-gray-600">"Appelez maintenant : +241 01 23 45 67"</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md text-center">
                <h4 className="font-semibold text-[#146B67] mb-2">📱 WhatsApp</h4>
                <p className="text-sm text-gray-600">"Contactez-nous sur WhatsApp"</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md text-center">
                <h4 className="font-semibold text-[#146B67] mb-2">👁️ Visite</h4>
                <p className="text-sm text-gray-600">"Visite organisée cette semaine"</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Exemples de CTA Efficaces</h3>
              <ul className="space-y-2">
                <li>• "Visite possible dès demain - Contactez-nous !"</li>
                <li>• "Prix négociable - Appelez pour discuter"</li>
                <li>• "Photos supplémentaires disponibles sur demande"</li>
                <li>• "Financing possible - Renseignez-vous"</li>
                <li>• "Propriétaire direct - Pas de frais d&apos;agence"</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Mesurer l&apos;Efficacité de Vos Annonces
            </h2>
            
            <p className="mb-4">
              Pour optimiser vos annonces, il faut mesurer leur performance. 
              Voici les métriques importantes à suivre :
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Métriques d&apos;Engagement</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Vues de l&apos;annonce :</strong> Nombre de consultations</li>
                  <li>• <strong>Temps passé :</strong> Durée moyenne de visite</li>
                  <li>• <strong>Photos consultées :</strong> Galerie explorée</li>
                  <li>• <strong>Partages :</strong> Annonce partagée</li>
                  <li>• <strong>Favoris :</strong> Ajoutée aux favoris</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">📞 Métriques de Conversion</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Contacts générés :</strong> Appels/emails</li>
                  <li>• <strong>Taux de contact :</strong> % de vues qui contactent</li>
                  <li>• <strong>Visites organisées :</strong> Rendez-vous fixés</li>
                  <li>• <strong>Offres reçues :</strong> Propositions d&apos;achat</li>
                  <li>• <strong>Temps de vente :</strong> Durée jusqu&apos;à la vente</li>
                </ul>
              </div>
            </div>
            
            <p className="mb-4">
              <strong>Objectif réaliste :</strong> Un taux de contact de 5-10% et 
              un temps de vente de 30-60 jours pour une annonce bien optimisée.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Conclusion : L&apos;Art de la Vente Immobilière au Gabon
            </h2>
            
            <p className="mb-4">
              Structurer efficacement vos annonces immobilières au Gabon nécessite 
              une approche méthodique combinant marketing digital et connaissance 
              du marché local.
            </p>
            
            <div className="bg-[#146B67] text-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3"> Prêt à Optimiser Vos Annonces ?</h3>
              <p className="mb-4">
                Découvrez comment Trouve Ton Nkama peut vous aider à créer des annonces 
                performantes et maximiser vos chances de vente.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href={routes.public.property} 
                  className="bg-white text-[#146B67] px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  Publier une Annonce
                </Link>
                <Link 
                  href={routes.public.search_property} 
                  className="border border-white text-white px-6 py-3 rounded-lg hover:bg-white hover:text-[#146B67] transition-colors font-semibold"
                >
                  Voir les Exemples
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
            
            <Link href={routes.public.blog_tendances_marche} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-[#146B67] mb-2">
                  Tendances Marché Immobilier Gabon 2024
                </h4>
                <p className="text-sm text-gray-600">
                  Analyse complète du marché immobilier gabonais et opportunités d&apos;investissement.
                </p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
} 