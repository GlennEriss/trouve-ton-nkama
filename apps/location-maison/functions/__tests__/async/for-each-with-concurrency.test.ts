import { forEachWithConcurrency } from '../../src/async/for-each-with-concurrency';

describe('forEachWithConcurrency', () => {
  it('traite chaque élément exactement une fois sans dépasser la concurrence demandée', async () => {
    const seen: number[] = [];
    let active = 0;
    let maximumActive = 0;

    await forEachWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (item) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      seen.push(item);
      active -= 1;
    });

    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(maximumActive).toBe(2);
  });

  it('accepte une liste vide et borne une concurrence invalide à un worker', async () => {
    const worker = jest.fn(async () => undefined);

    await forEachWithConcurrency([], 0, worker);
    await forEachWithConcurrency([1, 2], 0, worker);

    expect(worker).toHaveBeenCalledTimes(2);
  });
});
