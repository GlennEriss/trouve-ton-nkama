/**
 * Exécute `worker` sur chaque élément de `items`, avec au plus `limit` tâches actives en
 * même temps — voir docs/performance-creation-modification-annonces-reels.md, point 4
 * (« Remplacer le parallélisme illimité par une concurrence contrôlée »). Remplace un
 * `Promise.all(items.map(worker))` qui lance tout instantanément, ce qui sature la bande
 * passante et le CPU sur mobile à mesure que le nombre de fichiers augmente.
 *
 * Contrat :
 * - résultat dans le même ordre que `items`, quel que soit l'ordre réel de résolution ;
 * - jamais plus de `limit` tâches actives simultanément ;
 * - après le premier échec, plus aucune NOUVELLE tâche n'est démarrée — les tâches déjà en
 *   cours à cet instant se terminent normalement (succès ou échec), sans rejet orphelin :
 *   `mapWithConcurrency` ne se rejette qu'une fois que tous les workers actifs se sont
 *   arrêtés, avec la PREMIÈRE erreur rencontrée ;
 * - tableau vide accepté (retourne `[]` immédiatement) ;
 * - `items` n'est jamais muté.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const effectiveLimit = Math.max(1, Math.min(limit, items.length));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let failed = false;
  let firstError: unknown = null;

  async function runLane(): Promise<void> {
    while (!failed) {
      const currentIndex = nextIndex;
      if (currentIndex >= items.length) return;
      nextIndex += 1;

      try {
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstError = error;
        }
        return;
      }
    }
  }

  await Promise.all(Array.from({ length: effectiveLimit }, () => runLane()));

  if (failed) {
    throw firstError;
  }
  return results;
}
