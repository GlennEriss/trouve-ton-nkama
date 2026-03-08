import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#f4f7f7] px-6 py-16 text-[#17312f]">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[#d2e4e2] bg-white p-8 shadow-sm">
        <p className="mb-3 inline-flex rounded-full bg-[#e7f5f2] px-3 py-1 text-xs font-semibold tracking-wide text-[#146B67]">
          MODE HORS LIGNE
        </p>
        <h1 className="text-2xl font-bold">Connexion internet indisponible</h1>
        <p className="mt-3 text-sm leading-6 text-[#4a6461]">
          Certaines fonctions restent accessibles, mais les recherches en temps reel, les
          mises a jour de vos annonces et les actions de compte necessitent une connexion.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#146B67] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115c59]"
          >
            Retour a l'accueil
          </Link>
          <Link
            href="/search"
            className="rounded-full border border-[#b9d8d4] px-5 py-2.5 text-sm font-semibold text-[#146B67] transition hover:bg-[#f0f8f7]"
          >
            Ouvrir la recherche
          </Link>
        </div>
      </div>
    </main>
  );
}
