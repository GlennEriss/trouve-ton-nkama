'use client'

import { useChunkErrorRecovery } from '@/lib/errors/use-chunk-error-recovery'

/**
 * Dernier filet de sécurité : se déclenche uniquement quand l'erreur vient du RootLayout
 * lui-même (Providers, etc.) — error.tsx ne protège que ce que le layout racine rend comme
 * children, pas le layout racine lui-même. Remplace donc tout le document (html/body compris,
 * imposé par Next.js pour ce fichier précis) — volontairement sans dépendance à Tailwind/fonts
 * du layout normal, puisque c'est justement ce layout qui vient de planter.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useChunkErrorRecovery(error)

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '4rem 1.25rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Un problème est survenu</p>
        <p style={{ fontSize: '0.875rem', color: '#4B5563' }}>
          Nous en avons été informés. Réessayez, ou revenez à l&apos;accueil.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: '44px',
              padding: '0 1.5rem',
              borderRadius: '9999px',
              backgroundColor: '#146B67',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
          <a
            href="/"
            style={{
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 1.5rem',
              borderRadius: '9999px',
              border: '1px solid #146B67',
              color: '#146B67',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </body>
    </html>
  )
}
