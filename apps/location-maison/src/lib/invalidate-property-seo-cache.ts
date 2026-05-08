const SEO_REVALIDATE_ENDPOINT = '/api/seo/revalidate-property-cache';
const SEO_REVALIDATE_TIMEOUT_MS = 2500;

export async function invalidatePropertySeoCache() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SEO_REVALIDATE_TIMEOUT_MS);

    try {
      await fetch(SEO_REVALIDATE_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  } catch {
    // Best effort uniquement: l'invalidation SEO ne doit pas casser le flow utilisateur.
  }
}
