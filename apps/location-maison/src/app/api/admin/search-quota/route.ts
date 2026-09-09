import { NextResponse } from 'next/server';

import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import { getQuotaStatus } from '@/lib/search/algolia-quota-store';

const logger = createLogger('api.admin.search-quota');

/**
 * État du compteur de quota Algolia (cycle de facturation du 9 au 8), pour la carte admin
 * `/admin/search-quota`. Lecture seule. Voir
 * docs/location-maison/setup/ALGOLIA-QUOTA-FAILOVER.md §12.
 */
export async function GET() {
  const session = await auth();
  const roles = session?.user?.roles ?? [];

  if (!session?.user || !roles.includes('Admin')) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
  }

  try {
    const status = await getQuotaStatus();
    return NextResponse.json({ status });
  } catch (error) {
    logger.error('Lecture du statut de quota Algolia impossible', { error });
    return NextResponse.json({ error: 'Statut indisponible.' }, { status: 502 });
  }
}
