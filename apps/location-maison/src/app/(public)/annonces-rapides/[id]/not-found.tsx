import Link from 'next/link';
export default function NotFound() {
  return <div className="mx-auto max-w-3xl space-y-4 p-6"><h1 className="text-2xl font-bold">Annonce indisponible</h1><p>Cette annonce est introuvable ou n’est pas accessible publiquement.</p><Link href="/" className="inline-flex min-h-11 items-center text-primary underline">Retour à l’accueil</Link></div>;
}
