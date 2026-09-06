'use client'

import Link from 'next/link'
import { routes } from '@/constantes/routes'
import { useChunkErrorRecovery } from '@/lib/errors/use-chunk-error-recovery'

/**
 * Filet de sécurité pour toute erreur non attrapée dans l'arbre de rendu — jusqu'ici absent,
 * ce qui faisait tomber n'importe quelle exception (y compris une simple erreur de chunk après
 * déploiement, voir chunk-load-error.ts) sur la page générique de Next.js : "Application error:
 * a client-side exception has occurred", sans marque ni recours pour le visiteur. Garde la
 * navbar/footer du layout parent (contrairement à global-error.tsx, qui remplace tout).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useChunkErrorRecovery(error)

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-5 py-16 text-center">
      <p className="text-lg font-semibold text-ink dark:text-white">Un problème est survenu</p>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Nous en avons été informés. Réessayez, ou revenez à l&apos;accueil.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          Réessayer
        </button>
        <Link
          href={routes.public.homePage}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-secondary px-6 py-2.5 text-sm font-semibold text-secondary transition hover:bg-secondary/5"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
