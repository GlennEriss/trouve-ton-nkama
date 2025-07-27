import type { Metadata } from "next";
import React from 'react';
import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { 
  TrendingUp, 
  CreditCard, 
  Smartphone, 
  Megaphone, 
  MapPin, 
  DollarSign, 
  Newspaper, 
  BookOpen 
} from 'lucide-react';

export const metadata: Metadata = {
  title: "Blog Immobilier Gabon - Conseils, Actualités, Prix | Trouve Ton Nkama",
  description: "Blog immobilier Gabon : conseils d'investissement, prix du marché Libreville, Port-Gentil, quartiers tendance, guide achat location. Actualités immobilières Gabon.",
  keywords: "blog immobilier Gabon, conseils immobilier Libreville, prix immobilier Port-Gentil, guide investissement Gabon, actualités immobilières Gabon, quartiers Libreville",
};

export default function BlogPage() {
  const articles = [
    {
      id: 'tendances-marche',
      title: "Tendances du Marché Immobilier au Gabon 2024 🇬🇦",
      description: "Analyse complète du marché immobilier gabonais : croissance Libreville, Port-Gentil, projet Libreville 2, logements sociaux. Conseils experts pour investir au Gabon.",
      date: "15 janvier 2024",
      readTime: "12 min de lecture",
      category: "Marché immobilier",
      url: routes.public.blog_tendances_marche,
      image: "/assets/home-page/libreville.webp",
      highlights: [
        "Croissance du marché Libreville et Port-Gentil",
        "Projet Libreville 2 et logements sociaux",
        "Opportunités d'investissement 2024",
        "Conseils pour investisseurs et propriétaires"
      ]
    },
    {
      id: 'financement',
      title: "Financement Immobilier au Gabon : État des Lieux et Solutions 2024 ",
      description: "Guide complet financement immobilier Gabon : crédit immobilier, refinancement hypothécaire, micro-crédit, épargne. Solutions pour financer son logement au Gabon.",
      date: "20 janvier 2024",
      readTime: "15 min de lecture",
      category: "Financement immobilier",
      url: routes.public.blog_financement,
      image: "/assets/home-page/port-gentil.webp",
      highlights: [
        "Crédit immobilier : banques et conditions",
        "Refinancement hypothécaire émergent",
        "Micro-crédit et solutions alternatives",
        "Stratégies d'épargne et PPP"
      ]
    },
    {
      id: 'commissions-demarcheurs',
      title: "Commissions Élevées des Démarcheurs de Logements au Gabon : Problèmes et Solutions ",
      description: "Découvrez les problèmes des commissions élevées des démarcheurs au Gabon : pratiques abusives, solutions alternatives, plateformes en ligne. Guide pour éviter les frais excessifs.",
      date: "25 janvier 2024",
      readTime: "18 min de lecture",
      category: "Marché immobilier",
      url: routes.public.blog_commissions_demarcheurs,
      image: "/assets/home-page/port-gentil.webp",
      highlights: [
        "Commissions de 3-6 mois de loyer",
        "Pratiques abusives dénoncées",
        "Solutions alternatives (plateformes en ligne)",
        "Conseils pour éviter les frais excessifs"
      ]
    },
    {
      id: 'structurer-annonces',
      title: "Comment Structurer Vos Annonces pour Maximiser l'Engagement 📝",
      description: "Guide complet pour structurer vos annonces immobilières au Gabon : titres accrocheurs, descriptions optimisées, photos professionnelles, CTAs efficaces.",
      date: "30 janvier 2024",
      readTime: "15 min de lecture",
      category: "Marketing immobilier",
      url: routes.public.blog_structurer_annonces,
      image: "/assets/home-page/form.webp",
      highlights: [
        "Titres accrocheurs et formules magiques",
        "Descriptions structurées et émotionnelles",
        "Galerie photo optimisée",
        "Call-to-Action efficaces"
      ]
    },
    {
      id: 'proptech',
      title: "Digital & PropTech : L'Innovation au Service de l'Immobilier Gabonais ",
      description: "Découvrez l'innovation PropTech au Gabon : plateformes en ligne, IA, Google My Business, outils de monitoring. L'avenir de l'immobilier gabonais.",
      date: "5 février 2024",
      readTime: "20 min de lecture",
      category: "PropTech & Innovation",
      url: routes.public.blog_proptech,
      image: "/assets/home-page/estuaire.webp",
      highlights: [
        "Révolution PropTech au Gabon",
        "Portails qui dominent le SEO",
        "Intelligence Artificielle appliquée",
        "Outils de monitoring essentiels"
      ]
    },
    {
      id: 'guide-quartiers-libreville',
      title: "Guide Complet des Quartiers Libreville 2024-2025 ",
      description: "Guide complet quartiers Libreville 2024-2025 : prix par quartier, ambiance, services, écoles, commerces. Glass, Akébé, Louis, Nzeng-Ayong, Bellevue, Owendo.",
      date: "10 février 2024",
      readTime: "25 min de lecture",
      category: "Quartiers",
      url: routes.public.blog_guide_quartiers_libreville,
      image: "/assets/home-page/libreville.webp",
      highlights: [
        "Prix par quartier (Glass, Akébé, Louis)",
        "Quartiers accessibles (Nzeng-Ayong, Bellevue)",
        "Conseils pour choisir son quartier",
        "Tendances 2024-2025 et plus-values"
      ]
    },
    {
      id: 'guide-quartiers-port-gentil',
      title: "Guide Complet des Quartiers Port-Gentil 2024-2025 ",
      description: "Guide complet quartiers Port-Gentil 2024-2025 : prix par quartier, ambiance, services, écoles, commerces. Matanda, Montagne Sainte, Olowé, Centre-Ville.",
      date: "12 février 2024",
      readTime: "20 min de lecture",
      category: "Quartiers",
      url: routes.public.blog_guide_quartiers_port_gentil,
      image: "/assets/home-page/port-gentil.webp",
      highlights: [
        "Prix par quartier (Montagne Sainte, Centre-Ville)",
        "Quartiers en développement (Olowé, Matanda)",
        "Potentiel d'investissement par zone",
        "Tendances 2024-2025 et opportunités"
      ]
    },
    {
      id: 'rentabilite-immobiliere',
      title: "Rentabilité Immobilière Gabon 2024-2025 : ROI, Cash-Flow, Stratégies ",
      description: "Guide complet rentabilité immobilière Gabon 2024-2025 : ROI par ville, cash-flow, stratégies d'investissement, plus-value et conseils d'experts.",
      date: "15 février 2024",
      readTime: "30 min de lecture",
      category: "Investissement",
      url: routes.public.blog_rentabilite_immobiliere,
      image: "/assets/home-page/estuaire.webp",
      highlights: [
        "ROI par ville et quartier (8-12%)",
        "Calcul du cash-flow immobilier",
        "Stratégies d'investissement (3 types)",
        "Tableau comparatif des opportunités"
      ]
    },
    {
      id: 'actualites-immobilieres',
      title: "Actualités Immobilières Gabon 2024-2025 : Projets, Lois, Tendances ",
      description: "Actualités immobilières Gabon 2024-2025 : nouveaux projets de construction, évolutions législatives, tendances du marché, investissements majeurs.",
      date: "20 février 2024",
      readTime: "25 min de lecture",
      category: "Actualités",
      url: routes.public.blog_actualites_immobilieres,
      image: "/assets/home-page/libreville.webp",
      highlights: [
        "Nouveaux projets immobiliers 2024-2025",
        "Évolutions législatives (loi foncière)",
        "Investissements majeurs (445M FCFA)",
        "Perspectives 2025-2030"
      ]
    },
    {
      id: 'conseils-negociation',
      title: "Conseils Négociation Immobilière Gabon : Techniques et Astuces ",
      description: "Guide complet négociation immobilière Gabon : techniques, astuces, erreurs à éviter, préparation, argumentation, conclusion. Conseils experts.",
      date: "25 février 2024",
      readTime: "20 min de lecture",
      category: "Conseils pratiques",
      url: routes.public.blog_conseils_negociation,
      image: "/assets/home-page/form.webp",
      highlights: [
        "Techniques psychologiques et financières",
        "Scripts de négociation par situation",
        "Erreurs à éviter absolument",
        "Checklist complète de négociation"
      ]
    },
    {
      id: 'demarches-administratives',
      title: "Démarches Administratives Immobilier Gabon 2024 : Guide Complet ",
      description: "Guide complet démarches administratives immobilier Gabon 2024 : achat, location, titre foncier, cadastre, notaire, taxes, procédures légales.",
      date: "28 février 2024",
      readTime: "30 min de lecture",
      category: "Conseils pratiques",
      url: routes.public.blog_demarches_administratives,
      image: "/assets/home-page/port-gentil.webp",
      highlights: [
        "Étapes obligatoires pour achat/location",
        "Taxes et droits immobiliers 2024",
        "Délais et coûts des démarches",
        "Conseils pour sécuriser les transactions"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-[1440px] mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#146B67] mb-6">
              Blog Immobilier Gabon
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Découvrez nos conseils experts, analyses du marché et guides pratiques 
              pour réussir dans l'immobilier au Gabon. Actualités, prix, quartiers et innovations.
            </p>
          </div>

          {/* Articles Grid */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article key={article.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                {/* Image */}
                <div className="h-48 bg-gradient-to-br from-[#C1DEE8] to-[#FBD9B9] flex items-center justify-center">
                  <div className="text-4xl"></div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  {/* Category */}
                  <div className="mb-3">
                    <span className="inline-block bg-[#146B67] text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {article.category}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {article.title}
                  </h2>
                  
                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {article.description}
                  </p>
                  
                  {/* Highlights */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-[#146B67] mb-2">Points clés :</h4>
                    <ul className="space-y-1">
                      {article.highlights.slice(0, 2).map((highlight, index) => (
                        <li key={index} className="text-xs text-gray-600 flex items-start">
                          <span className="text-[#146B67] mr-2">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span> {article.date}</span>
                    <span> {article.readTime}</span>
                  </div>
                  
                  {/* CTA */}
                  <Link 
                    href={article.url}
                    className="inline-flex items-center justify-center w-full bg-[#146B67] text-white px-4 py-2 rounded-lg hover:bg-[#0f5a57] transition-colors font-semibold text-sm"
                  >
                    Lire l'article complet
                    <span className="ml-2">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Newsletter Section */}
          <div className="mt-16 bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9] rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-[#146B67] mb-4">
              Restez Informé du Marché Immobilier Gabonais
            </h3>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Recevez nos derniers articles, analyses de marché et conseils d'experts 
              directement dans votre boîte mail. Pas de spam, juste du contenu de qualité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Votre adresse email"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#146B67]"
              />
              <button className="bg-[#146B67] text-white px-6 py-3 rounded-lg hover:bg-[#0f5a57] transition-colors font-semibold">
                S'abonner
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-[#146B67] mb-6 text-center">
              Catégories d'Articles
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Marché immobilier", count: 2, icon: <TrendingUp className="text-4xl text-[#146B67]" /> },
                { name: "Financement", count: 1, icon: <CreditCard className="text-4xl text-[#146B67]" /> },
                { name: "PropTech", count: 1, icon: <Smartphone className="text-4xl text-[#146B67]" /> },
                { name: "Marketing immobilier", count: 1, icon: <Megaphone className="text-4xl text-[#146B67]" /> },
                { name: "Quartiers", count: 2, icon: <MapPin className="text-4xl text-[#146B67]" /> },
                { name: "Investissement", count: 1, icon: <DollarSign className="text-4xl text-[#146B67]" /> },
                { name: "Actualités", count: 1, icon: <Newspaper className="text-4xl text-[#146B67]" /> },
                { name: "Conseils pratiques", count: 2, icon: <BookOpen className="text-4xl text-[#146B67]" /> }
              ].map((category) => (
                <div key={category.name} className="bg-white p-6 rounded-xl text-center hover:shadow-lg transition-all duration-300 hover:scale-105 border border-gray-100">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gradient-to-br from-[#C1DEE8] to-[#FBD9B9] rounded-full">
                      {category.icon}
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{category.name}</h4>
                  <p className="text-sm text-gray-500">{category.count} article{category.count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 bg-[#146B67] rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">
              Prêt à Investir dans l'Immobilier Gabonais ?
            </h3>
            <p className="text-lg mb-6 opacity-90">
              Découvrez nos annonces immobilières vérifiées et trouvez l'opportunité 
              d'investissement qui vous correspond.
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
                Guide Immobilier Complet
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 