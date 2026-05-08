import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/error-response';

const logger = createLogger('api.seo.revalidate-property-cache');

export async function POST() {
  try {
    const session = await auth();
    const uid = session?.user?.uid;

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentification requise.',
          },
        },
        { status: 401 }
      );
    }

    revalidateTag('landing-properties');
    revalidatePath('/sitemap.xml');

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/seo/revalidate-property-cache',
      fallbackMessage: 'Failed to revalidate property SEO cache',
    });
  }
}
