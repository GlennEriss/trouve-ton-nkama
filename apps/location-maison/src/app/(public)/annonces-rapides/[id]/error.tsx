'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div role="alert" className="mx-auto max-w-3xl space-y-4 p-6"><p>Impossible de charger l’annonce. Veuillez réessayer.</p><button type="button" onClick={reset} className="min-h-11 rounded-full bg-primary px-5 py-3 text-white">Réessayer</button></div>;
}
