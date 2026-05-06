const DEFAULT_SITE_ORIGIN = 'https://www.tonnkama.com';

function normalizeOrigin(rawOrigin: string | undefined | null): string {
  const raw = rawOrigin?.trim();

  if (!raw) {
    return DEFAULT_SITE_ORIGIN;
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(candidate);
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (isLocalhost && process.env.NODE_ENV === 'production') {
      return DEFAULT_SITE_ORIGIN;
    }

    return parsed.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

const SITE_ORIGIN = normalizeOrigin(process.env.NEXT_PUBLIC_HOST);

export function getSiteOrigin(): string {
  return SITE_ORIGIN;
}

export function absoluteUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, SITE_ORIGIN).toString();
}

export function canonical(path = '/'): string {
  return absoluteUrl(path);
}
