import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';

export const metadata: Metadata = {
  title: "Conseils Négociation Immobilière Gabon : Techniques, Stratégies | Trouve Ton Nkama",
  description: "Guide complet négociation immobilière Gabon : techniques, stratégies, conseils experts pour acheter ou vendre au meilleur prix. Négociation efficace immobilier Libreville, Port-Gentil.",
  keywords: "négociation immobilière Gabon, techniques négociation Libreville, stratégies achat immobilier Gabon, conseils vente immobilier, négociation prix immobilier",
};

export default function ConseilsNegociationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={routes.public.homePage} className="hover:text-primary">Accueil</Link>
          <span className="mx-2">→</span>
          <Link href={routes.public.blog} className="hover:text-primary">Blog</Link>
          <span className="mx-2">→</span>
          <span className="text-gray-800">Conseils Négociation Immobilière Gabon</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Conseils Négociation Immobilière Gabon : Techniques et Astuces 
          </h1>
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span> 25 février 2024</span>
            <span className="mx-2">•</span>
            <span> 20 min de lecture</span>
            <span className="mx-2">•</span>
            <span> Conseils pratiques</span>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Découvrez les techniques et astuces de négociation immobilière au Gabon : 
            préparation, argumentation, erreurs à éviter, et conseils d&apos;experts 
            pour négocier le meilleur prix et les meilleures conditions.
          </p>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Pourquoi la Négociation Immobilière est Cruciale au Gabon ?
            </h2>
            
            <p className="mb-4">
              Au Gabon, la négociation immobilière peut faire économiser 10 à 30% 
              du prix d&apos;achat ou de location. Voici pourquoi c&apos;est essentiel :
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Impact Financier</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Économies importantes :</strong> 5-15M FCFA sur un achat</li>
                  <li>• <strong>Réduction mensuelle :</strong> 50-200k FCFA sur un loyer</li>
                  <li>• <strong>Meilleures conditions :</strong> Charges, durée, garanties</li>
                  <li>• <strong>Flexibilité :</strong> Paiement, travaux, aménagements</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Avantages Immobiliers</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Travaux inclus :</strong> Rénovation, aménagement</li>
                  <li>• <strong>Mobilier :</strong> Équipements, meubles</li>
                  <li>• <strong>Services :</strong> Gardiennage, maintenance</li>
                  <li>• <strong>Durée :</strong> Bail plus long, stabilité</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Statistiques de Négociation au Gabon</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-primary">15%</h4>
                  <p className="text-sm">Réduction moyenne obtenue</p>
                </div>
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-primary">80%</h4>
                  <p className="text-sm">Des vendeurs acceptent une négociation</p>
                </div>
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-primary">25%</h4>
                  <p className="text-sm">Économies supplémentaires possibles</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Préparation : La Clé du Succès
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">🔍 Étude du Marché</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Données à Collecter</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Prix du quartier :</strong> Comparatifs récents</li>
                      <li>• <strong>Prix au m² :</strong> Moyenne et fourchette</li>
                      <li>• <strong>Durée de vente :</strong> Temps sur le marché</li>
                      <li>• <strong>Motif de vente :</strong> Urgence, succession</li>
                      <li>• <strong>État du bien :</strong> Travaux nécessaires</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Sources d&apos;Information</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Agences immobilières :</strong> Données de marché</li>
                      <li>• <strong>Notaires :</strong> Prix de vente réels</li>
                      <li>• <strong>Internet :</strong> Sites d&apos;annonces</li>
                      <li>• <strong>Réseaux :</strong> Bouche à oreille</li>
                      <li>• <strong>Experts :</strong> Conseils professionnels</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Plus vous avez d&apos;informations, plus votre négociation sera efficace. 
                    Préparez un dossier complet avec comparatifs et arguments.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Définition de Votre Stratégie</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Objectifs Financiers</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Prix maximum :</strong> Votre limite absolue</li>
                      <li>• <strong>Prix cible :</strong> Objectif réaliste</li>
                      <li>• <strong>Prix de départ :</strong> Première offre</li>
                      <li>• <strong>Marge de manœuvre :</strong> Zone de négociation</li>
                      <li>• <strong>Conditions :</strong> Modalités de paiement</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Objectifs Immobiliers</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Travaux inclus :</strong> Rénovation, aménagement</li>
                      <li>• <strong>Mobilier :</strong> Équipements, meubles</li>
                      <li>• <strong>Services :</strong> Gardiennage, maintenance</li>
                      <li>• <strong>Durée :</strong> Bail, délai de paiement</li>
                      <li>• <strong>Garanties :</strong> Assurances, cautions</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Définissez vos objectifs par ordre de priorité et préparez 
                    des arguments solides pour chaque point de négociation.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              🎭 Techniques de Négociation Immobilière
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Techniques Psychologiques</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Techniques d&apos;Influence</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Ancrage :</strong> Première offre basse</li>
                      <li>• <strong>Réciprocité :</strong> Concessions mutuelles</li>
                      <li>• <strong>Urgence :</strong> Créer un sentiment d&apos;urgence</li>
                      <li>• <strong>Autorité :</strong> Expert immobilier</li>
                      <li>• <strong>Rareté :</strong> D&apos;autres acheteurs intéressés</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">🤝 Techniques de Communication</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Écoute active :</strong> Comprendre les besoins</li>
                      <li>• <strong>Questions ouvertes :</strong> Obtenir des informations</li>
                      <li>• <strong>Silence :</strong> Créer de l&apos;inconfort</li>
                      <li>• <strong>Empathie :</strong> Se mettre à sa place</li>
                      <li>• <strong>Confiance :</strong> Établir une relation</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Utilisez ces techniques avec éthique. L&apos;objectif est une 
                    négociation gagnant-gagnant, pas une manipulation.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Techniques Financières</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Stratégies de Prix</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Offre initiale :</strong> 15-20% en dessous</li>
                      <li>• <strong>Progression :</strong> Augmentations progressives</li>
                      <li>• <strong>Contre-proposition :</strong> Réponse immédiate</li>
                      <li>• <strong>Deadline :</strong> Limite de temps</li>
                      <li>• <strong>Alternative :</strong> Autres biens disponibles</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">💳 Modalités de Paiement</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Comptant :</strong> Réduction pour paiement immédiat</li>
                      <li>• <strong>Échelonné :</strong> Paiement en plusieurs fois</li>
                      <li>• <strong>Crédit :</strong> Financement bancaire</li>
                      <li>• <strong>Échange :</strong> Bien contre bien</li>
                      <li>• <strong>Services :</strong> Travaux en échange</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Proposez différentes modalités de paiement pour montrer 
                    votre flexibilité et obtenir de meilleures conditions.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              🚫 Erreurs à Éviter en Négociation Immobilière
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">❌ Erreurs Psychologiques</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">😰 Erreurs Émotionnelles</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Coup de cœur :</strong> Acheter par émotion</li>
                      <li>• <strong>Urgence :</strong> Se précipiter</li>
                      <li>• <strong>Attachement :</strong> S&apos;attacher au bien</li>
                      <li>• <strong>Ego :</strong> Vouloir gagner à tout prix</li>
                      <li>• <strong>Stress :</strong> Perdre ses moyens</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">🤐 Erreurs de Communication</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Parler trop :</strong> Révéler ses limites</li>
                      <li>• <strong>Menacer :</strong> Créer de l&apos;hostilité</li>
                      <li>• <strong>Mentir :</strong> Perdre la confiance</li>
                      <li>• <strong>Interrompre :</strong> Manquer d&apos;informations</li>
                      <li>• <strong>Désespoir :</strong> Montrer sa faiblesse</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Solution</h4>
                  <p className="text-sm">
                    Restez calme, objectif et préparez-vous mentalement. 
                    La négociation est un jeu, pas une guerre.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">❌ Erreurs Techniques</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Erreurs Financières</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Pas de budget :</strong> Négocier sans limite</li>
                      <li>• <strong>Pas de comparatifs :</strong> Négocier à l&apos;aveugle</li>
                      <li>• <strong>Première offre :</strong> Accepter trop vite</li>
                      <li>• <strong>Pas de plan B :</strong> Être dépendant</li>
                      <li>• <strong>Oublier les charges :</strong> Sous-estimer les coûts</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Erreurs Immobilières</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Pas d&apos;inspection :</strong> Acheter sans vérifier</li>
                      <li>• <strong>Pas de titre :</strong> Négocier sans vérifier</li>
                      <li>• <strong>Pas de notaire :</strong> Éviter les professionnels</li>
                      <li>• <strong>Pas de contrat :</strong> Accord verbal</li>
                      <li>• <strong>Pas de garanties :</strong> Aucune protection</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Solution</h4>
                  <p className="text-sm">
                    Préparez-vous méthodiquement et entourez-vous de professionnels 
                    pour éviter ces erreurs coûteuses.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Scripts de Négociation par Situation
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Négociation d&apos;Achat</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">📞 Premier Contact</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm italic">
                        "Bonjour, je suis intéressé par votre bien. J&apos;ai visité plusieurs 
                        propriétés dans le quartier et je voudrais discuter du prix. 
                        Pouvez-vous me dire quel est votre prix de vente et depuis 
                        combien de temps le bien est sur le marché ?"
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2"> Première Offre</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm italic">
                        "Après avoir analysé le marché et les comparatifs, je peux 
                        vous proposer [PRIX -15%]. Ce prix tient compte des travaux 
                        nécessaires et du temps de vente. Qu&apos;en pensez-vous ?"
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">🤝 Contre-Négociation</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm italic">
                        "Je comprends votre position. Si je peux payer comptant 
                        et signer rapidement, pouvez-vous descendre à [PRIX -10%] ? 
                        Cela vous éviterait les frais d&apos;agence supplémentaires."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Négociation de Location</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">📞 Premier Contact</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm italic">
                        "Bonjour, je cherche un logement dans ce quartier. 
                        J&apos;ai un bon dossier et je peux payer plusieurs mois 
                        d&apos;avance. Pouvez-vous me parler des conditions ?"
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2"> Négociation du Loyer</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm italic">
                        "Le loyer me semble un peu élevé pour ce quartier. 
                        Si je m&apos;engage sur 2 ans et paie 3 mois d&apos;avance, 
                        pouvez-vous baisser de 10% ?"
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2"> Négociation des Conditions</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm italic">
                        "Pourriez-vous inclure les charges dans le loyer ? 
                        Et accepteriez-vous que je fasse quelques petits travaux 
                        d&apos;aménagement à mes frais ?"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Checklist de Négociation Immobilière
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Avant la Négociation</h3>
                <ul className="space-y-2 text-sm">
                  <li>☐ <strong>Étude du marché :</strong> Prix, comparatifs</li>
                  <li>☐ <strong>Inspection du bien :</strong> État, travaux</li>
                  <li>☐ <strong>Vérification légale :</strong> Titre, urbanisme</li>
                  <li>☐ <strong>Préparation financière :</strong> Budget, financement</li>
                  <li>☐ <strong>Définition des objectifs :</strong> Prix, conditions</li>
                  <li>☐ <strong>Préparation des arguments :</strong> Points forts/faibles</li>
                  <li>☐ <strong>Plan B :</strong> Alternatives disponibles</li>
                  <li>☐ <strong>Professionnels :</strong> Notaire, expert</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">🤝 Pendant la Négociation</h3>
                <ul className="space-y-2 text-sm">
                  <li>☐ <strong>Écouter activement :</strong> Comprendre les besoins</li>
                  <li>☐ <strong>Poser des questions :</strong> Obtenir des informations</li>
                  <li>☐ <strong>Rester calme :</strong> Contrôler ses émotions</li>
                  <li>☐ <strong>Faire des concessions :</strong> Donner pour recevoir</li>
                  <li>☐ <strong>Utiliser le silence :</strong> Créer de l&apos;inconfort</li>
                  <li>☐ <strong>Proposer des alternatives :</strong> Modalités de paiement</li>
                  <li>☐ <strong>Fixer des deadlines :</strong> Créer de l&apos;urgence</li>
                  <li>☐ <strong>Prendre des notes :</strong> Garder une trace</li>
                </ul>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">📝 Après la Négociation</h3>
                <ul className="space-y-2 text-sm">
                  <li>☐ <strong>Résumer l&apos;accord :</strong> Points clés</li>
                  <li>☐ <strong>Rédiger un contrat :</strong> Conditions écrites</li>
                  <li>☐ <strong>Vérifier les détails :</strong> Modalités, délais</li>
                  <li>☐ <strong>Consulter un notaire :</strong> Validation légale</li>
                  <li>☐ <strong>Organiser le paiement :</strong> Modalités, échéances</li>
                  <li>☐ <strong>Planifier les travaux :</strong> Si nécessaire</li>
                  <li>☐ <strong>Assurer le bien :</strong> Protection</li>
                  <li>☐ <strong>Fêter le succès :</strong> Récompense</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">❌ À Éviter Absolument</h3>
                <ul className="space-y-2 text-sm">
                  <li>☐ <strong>Se précipiter :</strong> Prendre le temps</li>
                  <li>☐ <strong>Révéler ses limites :</strong> Garder ses secrets</li>
                  <li>☐ <strong>Mentir :</strong> Être honnête</li>
                  <li>☐ <strong>Menacer :</strong> Rester courtois</li>
                  <li>☐ <strong>Négocier seul :</strong> Se faire accompagner</li>
                  <li>☐ <strong>Oublier les charges :</strong> Budget complet</li>
                  <li>☐ <strong>Signer sans lire :</strong> Vérifier les clauses</li>
                  <li>☐ <strong>Émotionnel :</strong> Rester rationnel</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Conseils d&apos;Experts pour Réussir sa Négociation
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4">👨‍💼 Conseils de Notaires</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Préparation Légale</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Vérifier le titre :</strong> Authenticité, validité</li>
                      <li>• <strong>Contrôler les charges :</strong> Copropriété, taxes</li>
                      <li>• <strong>Vérifier l&apos;urbanisme :</strong> Certificat, PLU</li>
                      <li>• <strong>Contrôler les servitudes :</strong> Droits de passage</li>
                      <li>• <strong>Vérifier les hypothèques :</strong> Dettes, saisies</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">📝 Rédaction du Contrat</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Clauses protectrices :</strong> Conditions suspensives</li>
                      <li>• <strong>Modalités de paiement :</strong> Échéances, garanties</li>
                      <li>• <strong>État des lieux :</strong> Travaux, aménagements</li>
                      <li>• <strong>Garanties :</strong> Vices cachés, conformité</li>
                      <li>• <strong>Résolution :</strong> Conditions de rupture</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Un bon contrat protège les deux parties. N&apos;hésitez pas à 
                    consulter un notaire pour sécuriser votre transaction.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-primary mb-4"> Conseils d&apos;Agents Immobiliers</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Analyse de Marché</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Comparatifs récents :</strong> Prix de vente</li>
                      <li>• <strong>Évolution des prix :</strong> Tendances</li>
                      <li>• <strong>Durée de vente :</strong> Temps sur le marché</li>
                      <li>• <strong>Motifs de vente :</strong> Urgence, succession</li>
                      <li>• <strong>État du bien :</strong> Travaux nécessaires</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Stratégies de Négociation</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Timing :</strong> Moment optimal</li>
                      <li>• <strong>Argumentation :</strong> Points forts/faibles</li>
                      <li>• <strong>Concessions :</strong> Donner pour recevoir</li>
                      <li>• <strong>Deadline :</strong> Créer de l&apos;urgence</li>
                      <li>• <strong>Alternative :</strong> Plan B</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Les agents immobiliers connaissent le marché et les vendeurs. 
                    Utilisez leur expertise pour optimiser votre négociation.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">
               Conclusion : Maîtriser l&apos;Art de la Négociation
            </h2>
            
            <p className="mb-4">
              La négociation immobilière au Gabon est un art qui s&apos;apprend. 
              Avec une bonne préparation, les bonnes techniques et les bons conseils, 
              vous pouvez économiser des sommes importantes et obtenir de meilleures conditions.
            </p>
            
            <div className="bg-primary text-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3"> Prêt à Négocier Votre Bien Immobilier ?</h3>
              <p className="mb-4">
                Découvrez nos annonces immobilières et mettez en pratique 
                ces techniques de négociation pour obtenir le meilleur prix.
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
            <Link href={routes.public.blog_rentabilite_immobiliere} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-primary mb-2">
                  Rentabilité Immobilière Gabon 2024-2025
                </h4>
                <p className="text-sm text-gray-600">
                  Guide complet rentabilité immobilière : ROI, cash-flow, stratégies.
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