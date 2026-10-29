import { toWaMeDigits } from '@/lib/phone/gabon-whatsapp';
import { quickListingTitle, type PublicQuickListing } from '@/features/quick-listings/public-listing';
import QuickListingSafetyNotice from './QuickListingSafetyNotice';

export default function QuickListingDetail({ item }: { item: PublicQuickListing }) {
  const message = `Bonjour, je vous contacte au sujet de votre annonce sans photo à ${item.city} sur Trouve Ton Nkama (référence ${item.id}).`;
  const actionClass = 'inline-flex min-h-11 items-center justify-center rounded-full border border-primary px-5 py-3 font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-5 pb-28 pt-6 text-gray-900 dark:text-gray-100">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Annonce rapide · Sans photo</p>
        <h1 className="break-words text-2xl font-bold">{quickListingTitle(item)}</h1>
        <p className="break-words">{[item.province, item.city, item.neighborhood].filter(Boolean).join(' · ')}</p>
      </header>
      <QuickListingSafetyNotice />
      <section className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="font-semibold">Description de l’annonceur</h2>
        <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed">{item.description}</p>
      </section>
      <section aria-label="Contacter l’annonceur" className="space-y-3">
        <p className="break-words">Contact : {item.contactPhone}</p>
        <div className="flex flex-wrap gap-3">
          <a className={actionClass} href={`tel:${item.contactPhone}`}>Appeler</a>
          <a className={actionClass} href={`https://wa.me/${toWaMeDigits(item.contactPhone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </section>
    </article>
  );
}
