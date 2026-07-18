import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { META_GRAPH_API_VERSION, META_PIXEL_ID } from '@/features/analytics/meta-pixel/domain/config';

const logger = createLogger('api.meta.capi');

const bodySchema = z.object({
  event_name: z.string(),
  event_id: z.string(),
  event_source_url: z.string().url().optional(),
  custom_data: z.record(z.string(), z.unknown()).optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  hashed_email: z.string().optional(),
});

/**
 * Relaye côté serveur (Conversions API) les événements émis par meta-pixel.client.ts, avec le
 * même event_id que l'appel fbq() client pour dédup Meta. Objectif : fiabiliser les 3 signaux
 * qui comptent pour le futur ciblage pub (vue d'annonce, clic contacter, clic WhatsApp) contre
 * les bloqueurs de pub / ITP qui coupent le Pixel client seul.
 *
 * No-op (204) tant que META_PIXEL_ID ou META_CONVERSIONS_API_ACCESS_TOKEN ne sont pas
 * configurés — le Pixel client continue de fonctionner seul dans ce cas, cette route ne fait
 * qu'ajouter la couche de fiabilité serveur.
 */
export async function POST(request: NextRequest) {
  const accessToken = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
  if (!META_PIXEL_ID || !accessToken) {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new NextResponse(null, { status: 204 });
  }

  const { event_name, event_id, event_source_url, custom_data, fbp, fbc, hashed_email } = parsed.data;

  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = request.headers.get('user-agent') ?? undefined;

  const graphUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PIXEL_ID}/events`;
  const testEventCode = process.env.META_TEST_EVENT_CODE || undefined;

  try {
    const response = await fetch(graphUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
        data: [
          {
            event_name,
            event_id,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url,
            custom_data,
            user_data: {
              client_ip_address: clientIp,
              client_user_agent: userAgent,
              fbp,
              fbc,
              ...(hashed_email ? { em: [hashed_email] } : {}),
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      logger.warn('Meta Conversions API rejected event', {
        status: response.status,
        event_name,
        errorBody: errorBody.slice(0, 500),
      });
    }
  } catch (error) {
    logger.warn('Meta Conversions API call failed', { event_name, error });
  }

  return new NextResponse(null, { status: 204 });
}
