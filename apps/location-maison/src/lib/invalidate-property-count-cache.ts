export async function invalidatePropertyCountCache() {
  try {
    await fetch('/api/property/count/summary', { method: 'DELETE' });
  } catch {
    // Best effort only: l'invalidation ne doit pas bloquer le parcours utilisateur.
  }
}
