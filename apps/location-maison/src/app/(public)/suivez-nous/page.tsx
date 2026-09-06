import type { Metadata } from "next";
import { HeartHandshake, ArrowUpRight } from "lucide-react";
import { PLATFORM_SOCIAL_LINKS } from "@/constantes/social-links";

// Page liée depuis la notification "donnez de la force à Trouve Ton Nkama" — pas un contenu
// SEO, on ne veut pas qu'elle soit indexée à côté des vraies pages de contenu.
export const metadata: Metadata = {
  title: "Suivez-nous | Trouve Ton Nkama",
  description: "Retrouvez Trouve Ton Nkama sur Facebook, WhatsApp, TikTok, Instagram et Threads.",
  robots: { index: false, follow: false },
};

export default function FollowUsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <section className="mb-10 space-y-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2">
          <HeartHandshake className="h-5 w-5 text-secondary" />
          <span className="font-semibold text-primary dark:text-secondary">Merci pour votre soutien</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Donnez de la force à Trouve Ton Nkama
        </h1>
        <p className="mx-auto max-w-lg text-gray-600 dark:text-gray-300">
          Plus nous sommes visibles, plus il y a d&apos;annonces, de demandes et d&apos;opportunités pour
          tout le monde. Un simple abonnement suffit — ça prend 10 secondes et ça change beaucoup
          pour nous.
        </p>
      </section>

      <div className="space-y-3">
        {PLATFORM_SOCIAL_LINKS.map(({ key, label, url, icon: Icon, pitch }) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-secondary hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary transition group-hover:bg-secondary/15 group-hover:text-secondary dark:bg-gray-800 dark:text-primary-200">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-gray-900 dark:text-white">{label}</span>
              <span className="block text-sm leading-snug text-gray-500 dark:text-gray-400">{pitch}</span>
            </span>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-secondary dark:text-gray-600" aria-hidden="true" />
          </a>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-gray-400 dark:text-gray-500">
        Merci de faire partie de l&apos;aventure Trouve Ton Nkama 🙏
      </p>
    </div>
  );
}
