/**
 * Exécute un traitement asynchrone avec un nombre borné de workers.
 *
 * La fonction conserve une consommation mémoire O(concurrency), en plus du tableau
 * d'entrée, et évite aussi bien la sérialisation complète qu'un Promise.all non borné.
 */
export async function forEachWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), items.length);

  const run = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => run()));
}
