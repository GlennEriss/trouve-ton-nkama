import type { Metadata } from "next";
import React from 'react';

export const metadata: Metadata = {
  title: "Guide Immobilier Gabon 2024 - Prix, Quartiers, Conseils | Trouve Ton Nkama",
  description: "Guide complet immobilier Gabon 2024 : prix Libreville, Port-Gentil, quartiers tendance, conseils investissement, crédit immobilier, démarches administratives. Tout savoir sur l'immobilier au Gabon.",
  openGraph: {
    title: "Guide Immobilier Gabon 2024 - Prix & Conseils | Trouve Ton Nkama",
    description: "Guide complet immobilier Gabon : prix par ville, quartiers, investissement, crédit immobilier. Conseils experts pour acheter ou louer au Gabon.",
    url: `${process.env.NEXT_PUBLIC_HOST}/guide-immobilier-gabon`,
    type: "website",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/linkedin-og.jpg`,
        width: 1200,
        height: 630,
        alt: "Guide Immobilier Gabon Trouve Ton Nkama",
      },
    ],
  },
};

export default function GuideImmobilierGabonPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[#146B67] mb-6">
          Guide Immobilier Gabon 2024
        </h1>
        
        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Prix Immobilier par Ville
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3">Libreville</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Appartement 2 pièces :</strong> 150 000 - 300 000 FCFA/mois</li>
                  <li><strong>Maison 3 chambres :</strong> 400 000 - 800 000 FCFA/mois</li>
                  <li><strong>Villa 4+ chambres :</strong> 800 000 - 1 500 000 FCFA/mois</li>
                  <li><strong>Achat villa :</strong> 50 - 150 millions FCFA</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3">Port-Gentil</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Appartement 2 pièces :</strong> 120 000 - 250 000 FCFA/mois</li>
                  <li><strong>Maison 3 chambres :</strong> 300 000 - 600 000 FCFA/mois</li>
                  <li><strong>Villa 4+ chambres :</strong> 600 000 - 1 200 000 FCFA/mois</li>
                  <li><strong>Achat villa :</strong> 40 - 120 millions FCFA</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Quartiers Tendances Libreville
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Quartier Louis</h4>
                <p className="text-sm text-gray-600">Centre-ville, commerces, transport</p>
                <p className="text-sm font-medium mt-2">Prix : 200-400k FCFA/mois</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Akébé</h4>
                <p className="text-sm text-gray-600">Résidentiel, calme, écoles</p>
                <p className="text-sm font-medium mt-2">Prix : 300-600k FCFA/mois</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Glass</h4>
                <p className="text-sm text-gray-600">Moderne, expatriés, sécurité</p>
                <p className="text-sm font-medium mt-2">Prix : 500-1M FCFA/mois</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Nzeng-Ayong</h4>
                <p className="text-sm text-gray-600">Quartier résidentiel populaire, jeunes actifs</p>
                <p className="text-sm font-medium mt-2">Prix : 120-250k FCFA/mois</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Bellevue</h4>
                <p className="text-sm text-gray-600">Bien desservi, ambiance mixte, commerces</p>
                <p className="text-sm font-medium mt-2">Prix : 150-300k FCFA/mois</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Quartiers Tendances Port-Gentil
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Matanda</h4>
                <p className="text-sm text-gray-600">Quartier populaire et accessible, travailleurs</p>
                <p className="text-sm font-medium mt-2">Prix : 100-200k FCFA/mois</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Montagne Sainte</h4>
                <p className="text-sm text-gray-600">Zone calme, logements de bon standing</p>
                <p className="text-sm font-medium mt-2">Prix : 300-600k FCFA/mois</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Olowé</h4>
                <p className="text-sm text-gray-600">En expansion, bon potentiel investissement</p>
                <p className="text-sm font-medium mt-2">Prix : 200-400k FCFA/mois</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Conseils d'Investissement
            </h2>
            
            <div className="bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9] p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Pourquoi Investir au Gabon ?</h3>
              <ul className="space-y-3 text-gray-700">
                <li>✅ <strong>Stabilité politique</strong> et économique</li>
                <li>✅ <strong>Croissance démographique</strong> soutenue</li>
                <li>✅ <strong>Déficit de logements</strong> de qualité</li>
                <li>✅ <strong>Rentabilité locative</strong> attractive (6-10%)</li>
                <li>✅ <strong>Appréciation immobilière</strong> régulière</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Démarches Administratives
            </h2>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Pour Acheter</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Vérification du titre foncier</li>
                  <li>Vérification auprès du cadastre pour confirmer la délimitation du terrain</li>
                  <li>Consultation du service domanial pour connaître le statut juridique exact du bien</li>
                  <li>Certificat d&apos;urbanisme</li>
                  <li>Acte de vente notarié</li>
                  <li>Inscription hypothécaire</li>
                  <li>Paiement des droits de mutation</li>
                </ol>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <h4 className="font-semibold text-[#146B67] mb-2">Pour Louer</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Contrat de location écrit</li>
                  <li>État des lieux détaillé</li>
                  <li>Caution (1-3 mois de loyer)</li>
                  <li>Quittance de loyer</li>
                </ol>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Crédit Immobilier Gabon
            </h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Conditions 2024</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Banques Principales</h4>
                  <ul className="space-y-1 text-gray-700">
                    <li>• BGFI (Banque Gabonaise et Française Internationale)</li>
                    <li>• AFG Bank (ex-BICIG)</li>
                    <li>• UBA Gabon</li>
                    <li>• Ecobank Gabon</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Conditions Typiques</h4>
                  <ul className="space-y-1 text-gray-700">
                    <li>• Apport : 20-30% du bien</li>
                    <li>• Durée : 15-25 ans</li>
                    <li>• Taux : 8-12% annuel</li>
                    <li>• Revenus stables requis</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="text-center py-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              Prêt à Trouver Votre Logement ?
            </h2>
            <p className="text-gray-600 mb-6">
              Explorez nos annonces vérifiées et trouvez le logement idéal au Gabon
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-[#146B67] text-white px-8 py-3 rounded-lg hover:bg-[#0f5a57] transition-colors">
                Voir les Annonces
              </button>
              <button className="border border-[#146B67] text-[#146B67] px-8 py-3 rounded-lg hover:bg-[#146B67] hover:text-white transition-colors">
                Publier une Annonce
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
} 