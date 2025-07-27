import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { 
  Home, 
  MapPin, 
  DollarSign, 
  FileText, 
  Calculator, 
  Shield, 
  TrendingUp, 
  Users,
  Building,
  Car,
  School,
  ShoppingBag,
  Wifi,
  Zap,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Target,
  Clock,
  UserCheck,
  CreditCard,
  PiggyBank,
  BarChart3,
  Eye,
  Handshake,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

export const metadata: Metadata = {
  title: "Guide Immobilier Gabon 2024 - Prix des Loyers par Quartier, Conseils et Démarches | Trouve Ton Nkama",
  description: "Guide complet immobilier Gabon 2024 : prix des loyers par quartier Libreville, Port-Gentil, conseils location, démarches administratives, négociation loyer.",
};

export default function GuideImmobilierPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-[1440px] mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#146B67] mb-6">
              Guide Immobilier Gabon 2024
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Prix des Loyers par Quartier, Conseils et Démarches
            </p>
          </div>

          {/* Section 1: Comprendre le marché locatif */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-[#146B67] mb-6 flex items-center">
              <BarChart3 className="mr-2" />
              1. Comprendre le marché locatif (2024‑2025)
            </h2>
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start">
                <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" />
                <span><strong>Demande forte</strong> à Libreville et Port‑Gentil, surtout pour les 2‑3 pièces.</span>
              </div>
              <div className="flex items-start">
                <AlertTriangle className="text-orange-500 mr-3 mt-1 flex-shrink-0" />
                <span><strong>Offres mal documentées :</strong> beaucoup d'annonces sans prix, commissions élevées.</span>
              </div>
              <div className="flex items-start">
                <TrendingUp className="text-[#146B67] mr-3 mt-1 flex-shrink-0" />
                <span><strong>Loyers en hausse modérée</strong> (+4 à +8 %/an) dans les zones centrales, stabilité en périphérie.</span>
              </div>
            </div>
          </div>

          {/* Section 2: Fourchettes de loyers */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-[#146B67] mb-6 flex items-center">
              <DollarSign className="mr-2" />
              2. Fourchettes de loyers par ville et type de logement (FCFA / mois)
            </h2>
            
            {/* Libreville */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <MapPin className="mr-2 text-[#146B67]" />
                2.1 Libreville & périphérie (Owendo, Akanda/Angondjé, Bikélé…)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-[#146B67] text-white">
                      <th className="border border-gray-300 p-3 text-left">Type de logement</th>
                      <th className="border border-gray-300 p-3 text-left">Quartiers populaires (PK, Nzeng-Ayong, Akébé…)</th>
                      <th className="border border-gray-300 p-3 text-left">Quartiers centraux/standing (Glass, Louis, Sablière…)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">Chambre indépendante / studio simple</td>
                      <td className="border border-gray-300 p-3">60 000 – 120 000</td>
                      <td className="border border-gray-300 p-3">120 000 – 200 000 (souvent meublés)</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-semibold">2 pièces (salon + 1 chambre)</td>
                      <td className="border border-gray-300 p-3">120 000 – 220 000</td>
                      <td className="border border-gray-300 p-3">220 000 – 350 000</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">3 pièces (salon + 2 chambres)</td>
                      <td className="border border-gray-300 p-3">180 000 – 300 000</td>
                      <td className="border border-gray-300 p-3">280 000 – 450 000</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-semibold">Villa T4/T5</td>
                      <td className="border border-gray-300 p-3">300 000 – 500 000</td>
                      <td className="border border-gray-300 p-3">600 000 – 1 200 000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Port-Gentil */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <MapPin className="mr-2 text-[#146B67]" />
                2.2 Port‑Gentil
              </h3>
              <p className="text-sm text-gray-600 mb-4 italic">(Remplacement de Montagne Sainte par Château, comme demandé)</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-[#146B67] text-white">
                      <th className="border border-gray-300 p-3 text-left">Quartier / Zone</th>
                      <th className="border border-gray-300 p-3 text-left">Studio / 1p</th>
                      <th className="border border-gray-300 p-3 text-left">2 pièces</th>
                      <th className="border border-gray-300 p-3 text-left">3 pièces</th>
                      <th className="border border-gray-300 p-3 text-left">Villas / maisons</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">Château</td>
                      <td className="border border-gray-300 p-3">140k – 200k</td>
                      <td className="border border-gray-300 p-3">220k – 320k</td>
                      <td className="border border-gray-300 p-3">290k – 410k</td>
                      <td className="border border-gray-300 p-3">480k – 850k</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-semibold">Centre‑Ville</td>
                      <td className="border border-gray-300 p-3">120k – 180k</td>
                      <td className="border border-gray-300 p-3">200k – 300k</td>
                      <td className="border border-gray-300 p-3">260k – 380k</td>
                      <td className="border border-gray-300 p-3">450k – 800k</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">Olowé / Matanda</td>
                      <td className="border border-gray-300 p-3">90k – 140k</td>
                      <td className="border border-gray-300 p-3">170k – 260k</td>
                      <td className="border border-gray-300 p-3">220k – 320k</td>
                      <td className="border border-gray-300 p-3">380k – 650k</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Autres villes */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <MapPin className="mr-2 text-[#146B67]" />
                2.3 Autres grandes villes (ordres de grandeur)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-[#146B67] text-white">
                      <th className="border border-gray-300 p-3 text-left">Ville</th>
                      <th className="border border-gray-300 p-3 text-left">Studio / 1p</th>
                      <th className="border border-gray-300 p-3 text-left">2 pièces</th>
                      <th className="border border-gray-300 p-3 text-left">3 pièces</th>
                      <th className="border border-gray-300 p-3 text-left">Maison / Villa</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">Franceville</td>
                      <td className="border border-gray-300 p-3">60k – 110k</td>
                      <td className="border border-gray-300 p-3">120k – 200k</td>
                      <td className="border border-gray-300 p-3">180k – 260k</td>
                      <td className="border border-gray-300 p-3">250k – 400k</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3 font-semibold">Oyem / Lambaréné</td>
                      <td className="border border-gray-300 p-3">50k – 90k</td>
                      <td className="border border-gray-300 p-3">100k – 180k</td>
                      <td className="border border-gray-300 p-3">150k – 240k</td>
                      <td className="border border-gray-300 p-3">220k – 350k</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">Mouila / Koulamoutou</td>
                      <td className="border border-gray-300 p-3">45k – 80k</td>
                      <td className="border border-gray-300 p-3">90k – 160k</td>
                      <td className="border border-gray-300 p-3">130k – 220k</td>
                      <td className="border border-gray-300 p-3">200k – 320k</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="text-yellow-600 mr-2 mt-1 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    <strong>Charges</strong> (eau, électricité, gardiennage) le plus souvent non incluses : rajoute 10 000 à 40 000 FCFA/mois.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Démarches et sécurité */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-[#146B67] mb-6 flex items-center">
              <Shield className="mr-2" />
              3. Démarches et sécurité du bail
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <FileText className="text-[#146B67] mr-3 mt-1 flex-shrink-0" />
                <span><strong>Contrat écrit obligatoire :</strong> durée, dépôt de garantie, révision de loyer, charges.</span>
              </div>
              <div className="flex items-start">
                <Eye className="text-[#146B67] mr-3 mt-1 flex-shrink-0" />
                <span><strong>État des lieux + photos</strong> (entrée/sortie).</span>
              </div>
              <div className="flex items-start">
                <CreditCard className="text-[#146B67] mr-3 mt-1 flex-shrink-0" />
                <span><strong>Reçus de paiement</strong> (virement, mobile money) pour traçabilité.</span>
              </div>
              <div className="flex items-start">
                <AlertCircle className="text-[#146B67] mr-3 mt-1 flex-shrink-0" />
                <span><strong>Dépôt de garantie :</strong> 1 à 2 mois max (au-delà = méfiance).</span>
              </div>
            </div>
          </div>

          {/* Section 4: Négocier son loyer */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-[#146B67] mb-6 flex items-center">
              <Handshake className="mr-2" />
              4. Négocier son loyer : 4 astuces simples
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span>Arrive avec des comparatifs d'annonces du même quartier.</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span>Propose un engagement ferme 12 mois pour obtenir une remise.</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span>Offre de prendre en charge de petites réparations contre un rabais.</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span>Si tu paies trimestriellement (ou 6 mois), négocie un effort sur le montant.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Éviter les pièges */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-[#146B67] mb-6 flex items-center">
              <AlertTriangle className="mr-2" />
              5. Éviter les pièges
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <AlertCircle className="text-red-500 mr-3 mt-1 flex-shrink-0" />
                <span><strong>Loyers "tout inclus"</strong> sans détail (exige la liste précise).</span>
              </div>
              <div className="flex items-start">
                <AlertCircle className="text-red-500 mr-3 mt-1 flex-shrink-0" />
                <span><strong>Promesses verbales</strong> (peinture, climatiseur) non écrites.</span>
              </div>
              <div className="flex items-start">
                <AlertCircle className="text-red-500 mr-3 mt-1 flex-shrink-0" />
                <span><strong>Démarcheurs sans mandat</strong> → privilégie agences/plateformes de confiance.</span>
              </div>
              <div className="flex items-start">
                <AlertCircle className="text-red-500 mr-3 mt-1 flex-shrink-0" />
                <span><strong>Biens sans autorisation légale</strong> → complications pour justificatifs de domicile.</span>
              </div>
            </div>
          </div>

          {/* Section 6: Conseils pour bailleurs */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-[#146B67] mb-6 flex items-center">
              <Lightbulb className="mr-2" />
              6. Conseils express pour bailleurs
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Loyer réaliste</strong> = moins de vacance locative.</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Bail clair + quittances</strong> = locataires sérieux.</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Petites améliorations</strong> (peinture, wifi) = valeur locative ↑ immédiatement.</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9] rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-[#146B67] mb-4">
              Prêt à Trouver Votre Logement Idéal ?
            </h3>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Découvrez nos annonces immobilières vérifiées et trouvez le logement 
              qui correspond à vos critères et à votre budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href={routes.public.search_property}
                className="bg-[#146B67] text-white px-6 py-3 rounded-lg hover:bg-[#0f5a57] transition-colors font-semibold"
              >
                Voir les Annonces
              </Link>
              <Link 
                href={routes.public.blog}
                className="border border-[#146B67] text-[#146B67] px-6 py-3 rounded-lg hover:bg-[#146B67] hover:text-white transition-colors font-semibold"
              >
                Lire nos Conseils
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 