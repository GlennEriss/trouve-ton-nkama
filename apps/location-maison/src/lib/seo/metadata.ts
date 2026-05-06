import type { Metadata } from 'next';
import { canonical } from '@/lib/seo/site-url';

export function withCanonical(metadata: Metadata, path: string): Metadata {
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: canonical(path),
    },
  };
}

export function withNoIndex(metadata: Metadata): Metadata {
  return {
    ...metadata,
    robots: {
      index: false,
      follow: true,
    },
  };
}
