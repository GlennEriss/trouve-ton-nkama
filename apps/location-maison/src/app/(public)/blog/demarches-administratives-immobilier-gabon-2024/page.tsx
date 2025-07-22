import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';

export const metadata: Metadata = {
  title: "Démarches Administratives Immobilier Gabon 2024 - Guide Complet | Trouve Ton Nkama",
  description: "Guide complet démarches administratives immobilier Gabon 2024 : achat, location, titre foncier, cadastre, notaire, taxes, procédures légales. Tout savoir sur les formalités immobilières.",
  keywords: "démarches administratives immobilier Gabon 2024, titre foncier Gabon, cadastre Gabon, notaire immobilier Gabon, taxes immobilières Gabon, procédures légales immobilier Gabon",
  openGraph: {
    title: "Démarches Administratives Immobilier Gabon 2024 - Guide Complet",
    description: "Guide complet démarches administratives immobilier Gabon : achat, location, titre foncier, cadastre, notaire, taxes. Tout savoir sur les formalités.",
    url: `${process.env.NEXT_PUBLIC_HOST}/blog/demarches-administratives-immobilier-gabon-2024`,
    type: "article",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_HOST}/linkedin-og.jpg`,
        width: 1200,
        height: 630,
        alt: "Démarches Administratives Immobilier Gabon 2024",
      },
    ],
  },
};

export default function DemarchesAdministrativesImmobilierGabon2024Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={routes.public.homePage} className="hover:text-[#146B67]">Accueil</Link>
          <span className="mx-2">→</span>
          <Link href={routes.public.blog} className="hover:text-[#146B67]">Blog</Link>
          <span className="mx-2">→</span>
          <span className="text-gray-800">Démarches Administratives Immobilier Gabon 2024</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[#146B67] mb-4">
            Démarches Administratives Immobilier Gabon 2024 : Guide Complet
          </h1>
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span>28 février 2024</span>
            <span className="mx-2">•</span>
            <span>30 min de lecture</span>
            <span className="mx-2">•</span>
            <span>Conseils pratiques</span>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Découvrez le guide complet des démarches administratives immobilières au Gabon 
            en 2024 : achat, location, titre foncier, cadastre, notaire, taxes et procédures 
            légales. Tout savoir pour sécuriser vos transactions immobilières.
          </p>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Cadre Légal Immobilier au Gabon 2024
            </h2>
            
            <p className="mb-4">
              Le marché immobilier gabonais est encadré par un ensemble de lois et 
              règlements qui évoluent régulièrement. Voici le cadre légal en vigueur en 2024 :
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Lois Principales</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Code Civil :</strong> Droits de propriété</li>
                  <li>• <strong>Code Foncier :</strong> Régime foncier</li>
                  <li>• <strong>Code Urbanisme :</strong> Planification urbaine</li>
                  <li>• <strong>Code Fiscal :</strong> Taxes immobilières</li>
                  <li>• <strong>Code Notarial :</strong> Actes authentiques</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Institutions Clés</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Direction du Cadastre :</strong> Titres fonciers</li>
                  <li>• <strong>Service Domanial :</strong> Domaine public</li>
                  <li>• <strong>Direction Urbanisme :</strong> Certificats</li>
                  <li>• <strong>Direction Fiscalité :</strong> Taxes</li>
                  <li>• <strong>Chambre des Notaires :</strong> Actes</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3"> Points de Vigilance 2024</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">🆕 Nouvelles Obligations</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Certificat d&apos;urbanisme :</strong> Obligatoire depuis 2023</li>
                                          <li>• <strong>Étude d&apos;impact :</strong> Projets &gt; 500m²</li>
                    <li>• <strong>Normes environnementales :</strong> Renforcées</li>
                    <li>• <strong>Contrôle qualité :</strong> Inspections régulières</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2"> Nouvelles Taxes</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Taxe foncière :</strong> +15% en 2024</li>
                    <li>• <strong>Taxe d&apos;habitation :</strong> Nouvelle imposition</li>
                    <li>• <strong>Taxe environnementale :</strong> 2% sur construction</li>
                                          <li>• <strong>Taxe de luxe :</strong> Biens &gt; 100M FCFA</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Démarches pour l&apos;Achat Immobilier
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Étapes Obligatoires</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li>
                    <strong>Vérification du titre foncier</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Demander une copie du titre foncier</li>
                      <li>• Vérifier l&apos;authenticité au cadastre</li>
                      <li>• Contrôler les hypothèques et saisies</li>
                      <li>• Vérifier la superficie et les limites</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>Vérification auprès du cadastre</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Confirmer la délimitation du terrain</li>
                      <li>• Vérifier les servitudes</li>
                      <li>• Contrôler les droits de passage</li>
                      <li>• Vérifier les contraintes d&apos;urbanisme</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>Consultation du service domanial</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Vérifier le statut juridique du bien</li>
                      <li>• Contrôler si c&apos;est le domaine privé de l&apos;État</li>
                      <li>• Vérifier les droits d&apos;usage</li>
                      <li>• Contrôler les autorisations nécessaires</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>Certificat d&apos;urbanisme</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Demander le certificat à la mairie</li>
                      <li>• Vérifier la constructibilité</li>
                      <li>• Contrôler les règles d&apos;urbanisme</li>
                      <li>• Vérifier les contraintes architecturales</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>Acte de vente notarié</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Choisir un notaire compétent</li>
                      <li>• Préparer les documents requis</li>
                      <li>• Signer l&apos;acte authentique</li>
                      <li>• Enregistrer l&apos;acte au bureau des hypothèques</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>Inscription hypothécaire</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Déposer l&apos;acte au bureau des hypothèques</li>
                      <li>• Payer les droits d&apos;enregistrement</li>
                      <li>• Obtenir le certificat d&apos;inscription</li>
                      <li>• Vérifier la publication au journal officiel</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>Paiement des droits de mutation</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Calculer les droits de mutation</li>
                      <li>• Payer les taxes à la recette</li>
                      <li>• Obtenir l&apos;attestation de paiement</li>
                      <li>• Conserver les justificatifs</li>
                    </ul>
                  </li>
                </ol>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">📄 Documents Requis</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">👤 Documents Personnels</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Pièce d&apos;identité :</strong> Carte nationale ou passeport</li>
                      <li>• <strong>Justificatif de domicile :</strong> Facture récente</li>
                      <li>• <strong>Justificatif de revenus :</strong> Bulletins de salaire</li>
                      <li>• <strong>Justificatif de ressources :</strong> Relevés bancaires</li>
                      <li>• <strong>Certificat de célibat :</strong> Si applicable</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Documents Immobiliers</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Titre foncier :</strong> Original et copie</li>
                      <li>• <strong>Plan cadastral :</strong> Plan de situation</li>
                      <li>• <strong>Certificat d&apos;urbanisme :</strong> Validité 18 mois</li>
                      <li>• <strong>État des lieux :</strong> Si construction existante</li>
                      <li>• <strong>Autorisations :</strong> Permis de construire</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Conseil Important</h4>
                  <p className="text-sm">
                    Préparez tous les documents à l&apos;avance et faites des copies. 
                    Les délais administratifs peuvent être longs, anticipez !
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Démarches pour la Location Immobilière
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Étapes Obligatoires</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li>
                    <strong>Vérification du propriétaire</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Vérifier l&apos;identité du propriétaire</li>
                      <li>• Contrôler le titre de propriété</li>
                      <li>• Vérifier les droits de location</li>
                      <li>• Contrôler les charges de copropriété</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>Contrat de location écrit</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Rédiger un contrat détaillé</li>
                      <li>• Préciser le montant du loyer</li>
                      <li>• Définir la durée du bail</li>
                      <li>• Spécifier les charges incluses</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>État des lieux détaillé</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Faire l&apos;état des lieux d&apos;entrée</li>
                      <li>• Photographier chaque pièce</li>
                      <li>• Noter les défauts existants</li>
                      <li>• Signer l&apos;état des lieux</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>Caution et garanties</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Payer la caution (1-3 mois)</li>
                      <li>• Fournir une garantie bancaire</li>
                      <li>• Justifier de revenus suffisants</li>
                      <li>• Obtenir un justificatif de caution</li>
                    </ul>
                  </li>
                  
                  <li>
                    <strong>Quittance de loyer</strong>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>• Payer le loyer à temps</li>
                      <li>• Obtenir une quittance mensuelle</li>
                      <li>• Conserver les justificatifs</li>
                      <li>• Déclarer les revenus locatifs</li>
                    </ul>
                  </li>
                </ol>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">📄 Contenu du Contrat de Location</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Informations Obligatoires</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Identité des parties :</strong> Propriétaire et locataire</li>
                      <li>• <strong>Description du bien :</strong> Adresse, surface, pièces</li>
                      <li>• <strong>Montant du loyer :</strong> Prix et modalités</li>
                      <li>• <strong>Charges :</strong> Incluses ou non</li>
                      <li>• <strong>Durée du bail :</strong> Date début/fin</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">🔒 Clauses Protectrices</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Caution :</strong> Montant et restitution</li>
                      <li>• <strong>Résiliation :</strong> Conditions et délais</li>
                      <li>• <strong>Travaux :</strong> Responsabilités</li>
                      <li>• <strong>Assurance :</strong> Obligations</li>
                      <li>• <strong>Litiges :</strong> Procédure de résolution</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Conseil Important</h4>
                  <p className="text-sm">
                    Faites rédiger le contrat par un professionnel (notaire ou avocat) 
                    pour éviter les litiges futurs et protéger vos droits.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Taxes et Droits Immobiliers 2024
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Taxes d&apos;Achat</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Droits de Mutation</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Droits d&apos;enregistrement :</strong> 2.5% du prix</li>
                      <li>• <strong>Droits de timbre :</strong> 1% du prix</li>
                      <li>• <strong>Taxe de publicité foncière :</strong> 0.5%</li>
                      <li>• <strong>Frais de notaire :</strong> 1-2% du prix</li>
                      <li>• <strong>Frais d&apos;hypothèque :</strong> 0.5%</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Taxes Annuelles</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Taxe foncière :</strong> 0.5-1% de la valeur</li>
                      <li>• <strong>Taxe d&apos;habitation :</strong> Nouvelle en 2024</li>
                      <li>• <strong>Taxe de luxe :</strong> Biens &gt; 100M FCFA</li>
                      <li>• <strong>Taxe environnementale :</strong> 2% construction</li>
                      <li>• <strong>Taxe de spéculation :</strong> Revente &lt; 2 ans</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Calcul Approximatif</h4>
                  <p className="text-sm">
                    Pour un bien de 50M FCFA, comptez environ 3-4M FCFA de taxes 
                    et droits d&apos;achat (6-8% du prix).
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Taxes de Location</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Pour le Propriétaire</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Impôt sur les revenus :</strong> 10-35% des loyers</li>
                      <li>• <strong>Taxe foncière :</strong> 0.5-1% de la valeur</li>
                      <li>• <strong>Taxe d&apos;habitation :</strong> Nouvelle en 2024</li>
                      <li>• <strong>Charges de copropriété :</strong> Si applicable</li>
                      <li>• <strong>Assurance propriétaire :</strong> Obligatoire</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Pour le Locataire</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Loyer :</strong> Prix convenu</li>
                      <li>• <strong>Charges :</strong> Eau, électricité, etc.</li>
                      <li>• <strong>Caution :</strong> 1-3 mois de loyer</li>
                      <li>• <strong>Assurance locataire :</strong> Recommandée</li>
                      <li>• <strong>Frais d&apos;agence :</strong> Si applicable</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Optimisation Fiscale</h4>
                  <p className="text-sm">
                    Consultez un expert-comptable pour optimiser votre fiscalité 
                    immobilière et bénéficier des déductions possibles.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Délais et Coûts des Démarches 2024
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-md">
                <thead className="bg-[#146B67] text-white">
                  <tr>
                    <th className="p-4 text-left">Démarche</th>
                    <th className="p-4 text-left">Délai</th>
                    <th className="p-4 text-left">Coût</th>
                    <th className="p-4 text-left">Lieu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Vérification titre foncier</td>
                    <td className="p-4">1-2 semaines</td>
                    <td className="p-4">5-10k FCFA</td>
                    <td className="p-4">Cadastre</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-4 font-semibold">Certificat d&apos;urbanisme</td>
                    <td className="p-4">2-4 semaines</td>
                    <td className="p-4">15-25k FCFA</td>
                    <td className="p-4">Mairie</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Acte notarié</td>
                    <td className="p-4">1-2 semaines</td>
                    <td className="p-4">1-2% du prix</td>
                    <td className="p-4">Notaire</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-4 font-semibold">Inscription hypothécaire</td>
                    <td className="p-4">1 semaine</td>
                    <td className="p-4">0.5% du prix</td>
                    <td className="p-4">Bureau hypothèques</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Droits de mutation</td>
                    <td className="p-4">1 jour</td>
                    <td className="p-4">4% du prix</td>
                    <td className="p-4">Recette</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 font-semibold">Contrat de location</td>
                    <td className="p-4">1-3 jours</td>
                    <td className="p-4">50-100k FCFA</td>
                    <td className="p-4">Notaire/Avocat</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3"> Points d&apos;Attention</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">⏰ Délais</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Prévoir 2-3 mois</strong> pour un achat complet</li>
                    <li>• <strong>Les délais peuvent s&apos;allonger</strong> en période de forte demande</li>
                    <li>• <strong>Anticiper les congés</strong> des administrations</li>
                    <li>• <strong>Prévoir des marges</strong> pour les imprévus</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2"> Coûts</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Budget 6-8%</strong> du prix pour les frais</li>
                    <li>• <strong>Prévoir des suppléments</strong> pour les urgences</li>
                    <li>• <strong>Négocier les honoraires</strong> des professionnels</li>
                    <li>• <strong>Comparer les tarifs</strong> entre notaires</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              🛡️ Conseils pour Sécuriser vos Transactions
            </h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">🔍 Vérifications Essentielles</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Avant l&apos;Achat</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Expertise technique :</strong> Diagnostic complet</li>
                      <li>• <strong>Vérification légale :</strong> Notaire, avocat</li>
                      <li>• <strong>Étude de marché :</strong> Prix, tendances</li>
                      <li>• <strong>Inspection du bien :</strong> État, travaux</li>
                      <li>• <strong>Vérification fiscale :</strong> Impôts, taxes</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Avant la Location</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Vérification propriétaire :</strong> Identité, droits</li>
                      <li>• <strong>Inspection du logement :</strong> État, équipements</li>
                      <li>• <strong>Vérification contrat :</strong> Clauses, conditions</li>
                      <li>• <strong>Contrôle des charges :</strong> Montant, incluses</li>
                      <li>• <strong>Vérification assurances :</strong> Obligations</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Risques à Éviter</h4>
                  <p className="text-sm">
                    Ne signez jamais sans vérifier ! Les arnaques immobilières 
                    sont fréquentes. Privilégiez les professionnels reconnus.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">👨‍💼 Professionnels Recommandés</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2"> Obligatoires</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Notaire :</strong> Actes authentiques</li>
                      <li>• <strong>Expert-comptable :</strong> Optimisation fiscale</li>
                      <li>• <strong>Avocat :</strong> Conseils juridiques</li>
                      <li>• <strong>Expert immobilier :</strong> Diagnostic technique</li>
                      <li>• <strong>Agent immobilier :</strong> Accompagnement</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2"> Recommandés</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Architecte :</strong> Projets de construction</li>
                      <li>• <strong>Géomètre :</strong> Mesures et bornage</li>
                      <li>• <strong>Assureur :</strong> Couvertures adaptées</li>
                      <li>• <strong>Banquier :</strong> Financement immobilier</li>
                      <li>• <strong>Conseiller fiscal :</strong> Optimisation</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-[#146B67] mb-2"> Conseil Expert</h4>
                  <p className="text-sm">
                    Un bon professionnel vous fait économiser plus qu&apos;il ne vous coûte. 
                    Privilégiez la qualité et l&apos;expérience.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
              📞 Contacts Utiles et Ressources
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4"> Administrations</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Direction du Cadastre :</strong> Libreville, Port-Gentil</li>
                  <li>• <strong>Service Domanial :</strong> Ministère des Domaines</li>
                  <li>• <strong>Direction Urbanisme :</strong> Mairies</li>
                  <li>• <strong>Direction Fiscalité :</strong> Ministère des Finances</li>
                  <li>• <strong>Bureau des Hypothèques :</strong> Libreville</li>
                </ul>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-[#146B67] mb-4">👨‍💼 Professionnels</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Chambre des Notaires :</strong> Libreville</li>
                  <li>• <strong>Ordre des Avocats :</strong> Barreau du Gabon</li>
                  <li>• <strong>Ordre des Experts-Comptables :</strong> Libreville</li>
                  <li>• <strong>Fédération des Agents Immobiliers :</strong> Libreville</li>
                  <li>• <strong>Chambre de Commerce :</strong> Libreville, Port-Gentil</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3"> Ressources en Ligne</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">🌐 Sites Officiels</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Gouvernement Gabonais :</strong> www.gabon.ga</li>
                    <li>• <strong>Ministère des Domaines :</strong> Domaines.gouv.ga</li>
                    <li>• <strong>Direction des Impôts :</strong> Impots.gouv.ga</li>
                    <li>• <strong>Mairie Libreville :</strong> Libreville.ga</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">📱 Applications</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Cadastre en ligne :</strong> Consultation titres</li>
                    <li>• <strong>Impôts en ligne :</strong> Déclarations</li>
                    <li>• <strong>Mairie mobile :</strong> Certificats</li>
                    <li>• <strong>Notaires en ligne :</strong> Rendez-vous</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#146B67] mb-4">
               Conclusion : Sécuriser vos Transactions Immobilières
            </h2>
            
            <p className="mb-4">
              Les démarches administratives immobilières au Gabon en 2024 nécessitent 
              une approche méthodique et l&apos;accompagnement de professionnels qualifiés. 
              La préparation et la vérification sont essentielles pour sécuriser vos transactions.
            </p>
            
            <div className="bg-[#146B67] text-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3"> Besoin d&apos;Aide pour vos Démarches ?</h3>
              <p className="mb-4">
                Consultez nos experts immobiliers et obtenez un accompagnement 
                personnalisé pour vos démarches administratives.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href={routes.public.search_property} 
                  className="bg-white text-[#146B67] px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  Consulter nos Experts
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
            <Link href={routes.public.blog_conseils_negociation} className="block">
              <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-[#146B67] mb-2">
                  Conseils Négociation Immobilière Gabon
                </h4>
                <p className="text-sm text-gray-600">
                  Guide complet négociation immobilière : techniques, astuces, erreurs à éviter.
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