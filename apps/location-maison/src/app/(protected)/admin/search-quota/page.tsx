import { SearchQuotaCard } from '@/components/admin/SearchQuotaCard';

export const metadata = {
  title: 'Quota de recherche Algolia',
};

export default function SearchQuotaPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Quota de recherche Algolia</h1>
          <p className="text-gray-600">
            Suivi de la consommation Algolia sur le cycle de facturation (du 9 au 8) et état de la bascule
            automatique vers Meilisearch.
          </p>
        </div>

        <SearchQuotaCard />
      </div>
    </div>
  );
}
