/**
 * Création d'une demande de recherche DEPUIS L'APP MOBILE — gratuite, sans paiement MyPayGa,
 * contrairement au flux web public (/api/search-requests/initiate). Décision produit
 * explicite : inciter au téléchargement de l'app pendant sa phase de lancement (V1). Cette
 * route exige un token Firebase valide (contrairement au flux web, anonyme) — la V1 mobile
 * garde tout l'écran "Demandes" derrière l'authentification, donc l'utilisateur en a toujours
 * un à ce stade.
 *
 * moderationStatus démarre à PENDING (jamais APPROVED directement) : même file de modération
 * que les demandes saisies côté admin — voir search-requests-moderation (admin) et
 * ALGOLIA-COST-AUDIT.., non pas pour Algolia ici mais même esprit de contrôle humain avant
 * publication publique.
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminAuth } from '@/firebase/admin';
import { createLogger } from '@/lib/logger';
import { TypePropertyEnum } from '@trouve-ton-nkama/core/domain';
import { SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH } from '@/constantes/search-requests';
import { toGabonWhatsappE164 } from '@/lib/phone/gabon-whatsapp';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';

const logger = createLogger('api.search-requests.mobile-create');

const bodySchema = z
  .object({
    typeProperty: z.enum(Object.keys(TypePropertyEnum) as [string, ...string[]]),
    transactionType: z.enum(['FOR_RENT', 'FOR_SALE']),
    province: z.string().trim().min(1),
    city: z.string().trim().min(1),
    neighborhood: z.string().trim().max(120).optional(),
    budgetMinXaf: z.coerce.number().int().min(0),
    budgetMaxXaf: z.coerce.number().int().min(1),
    description: z.string().trim().min(10).max(SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH),
    whatsappContact: z.string().trim().min(6).max(20),
    secondaryContact: z.string().trim().min(6).max(20).optional(),
  })
  .refine((v) => v.budgetMinXaf <= v.budgetMaxXaf, {
    message: 'Le budget minimum doit être inférieur ou égal au budget maximum.',
    path: ['budgetMinXaf'],
  });

type AuthResult = { ok: true; uid: string } | { ok: false; response: ReturnType<typeof NextResponse.json> };

async function authenticate(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 }),
    };
  }
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { ok: true, uid: decoded.uid };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: 'Session invalide.' }, { status: 401 }),
    };
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authenticate(request);
  if (!authResult.ok) {
    return authResult.response;
  }
  const uid = authResult.uid;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'Données invalides.', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;

  try {
    const db = getFirestore();
    const docRef = db.collection(firebaseCollectionNames.search_requests).doc();

    await docRef.set({
      id: docRef.id,
      typeProperty: input.typeProperty,
      transactionType: input.transactionType,
      province: input.province,
      city: input.city,
      neighborhood: input.neighborhood ?? null,
      budgetMinXaf: input.budgetMinXaf,
      budgetMaxXaf: input.budgetMaxXaf,
      description: input.description,
      whatsappContact: toGabonWhatsappE164(input.whatsappContact),
      secondaryContact: input.secondaryContact ? toGabonWhatsappE164(input.secondaryContact) : null,

      source: 'mobile',
      createdByUid: uid,

      paymentStatus: 'not_required',
      amountPaidXaf: 0,

      boostRequested: false,
      boostPaid: false,
      boostStartAt: null,
      boostEndAt: null,

      moderationStatus: 'PENDING',
      rejectionReason: null,

      state: 'IN_PROGRESS',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('Demande de recherche créée depuis l\'app mobile (gratuite)', { id: docRef.id, uid });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    logger.error('Échec de création de demande de recherche mobile', { error, uid });
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
