import type { Metadata } from 'next';
import Link from 'next/link';
import { withCanonical } from '@/lib/seo/metadata';
import {
  LANDING_TRANSACTIONS,
  LANDING_TYPES,
  getGlobalLandingPath,
  getTransactionConfig,
  getTypeConfig,
} from '@/lib/seo/landing-taxonomy';

const immobilierMetadata: Metadata = {
  title: 'Immobilier Gabon - Pages par type et transaction | Trouve Ton Nkama',
  description:
    "Explorez nos pages immobilières par type de bien et transaction (location, vente) pour trouver rapidement maisons, appartements, studios, villas et terrains au Gabon.",
};

export const metadata: Metadata = withCanonical(immobilierMetadata, '/immobilier');

export default function ImmobilierIndexPage() {
  const links = LANDING_TRANSACTIONS.flatMap((transaction) => {
    const transactionConfig = getTransactionConfig(transaction);
    if (!transactionConfig) {
      return [];
    }

    return LANDING_TYPES.map((type) => {
      const typeConfig = getTypeConfig(type);
      if (!typeConfig) {
        return null;
      }

      return {
        href: getGlobalLandingPath(transaction, type),
        label: `${typeConfig.pluralLabel} ${transactionConfig.proposition}`,
      };
    }).filter((item): item is { href: string; label: string } => Boolean(item));
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="container-page rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">Immobilier au Gabon</h1>
          <p className="mt-4 text-gray-700">
            Accédez directement à nos pages thématiques pour comparer les annonces immobilières par type
            de bien et par transaction.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
