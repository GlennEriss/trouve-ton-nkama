import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-primary-50 px-6 py-16 text-primary-900">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-primary-100 bg-white p-8 shadow-sm">
        <p className="mb-3 inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
          MODE HORS LIGNE
        </p>
        <h1 className="text-2xl font-bold">Connexion internet indisponible</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Certaines fonctions restent accessibles, mais les recherches en temps reel, les
          mises a jour de vos annonces et les actions de compte necessitent une connexion.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-800"
          >
            Retour a l'accueil
          </Link>
          <Link
            href="/search"
            className="rounded-full border border-primary-200 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-100"
          >
            Ouvrir la recherche
          </Link>
        </div>
      </div>
    </main>
  );
}
