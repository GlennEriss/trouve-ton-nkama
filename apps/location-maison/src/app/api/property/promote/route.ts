import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { adminApp } from '@/firebase/admin';
import { createLogger } from '@/lib/logger';
import { auth } from '@/next-auth/auth';
import type { PromotionType } from '@/models/annonce';

const logger = createLogger('api.property.promote');

const PROMOTION_CONFIGS: Record<NonNullable<PromotionType>, { credits: number; duration: number; serviceName: string }> = {
  featured: { credits: 15, duration: 7, serviceName: 'Mise à la une' },
  'trending-7d': { credits: 10, duration: 7, serviceName: 'Mise en tendance 7j' },
  'trending-3d': { credits: 5, duration: 3, serviceName: 'Mise en tendance 3j' },
  boost: { credits: 3, duration: 0, serviceName: 'Boost' },
};

function isPromotionType(value: unknown): value is NonNullable<PromotionType> {
  return value === 'featured' || value === 'trending-7d' || value === 'trending-3d' || value === 'boost';
}

function hasActiveSamePromotion(data: FirebaseFirestore.DocumentData, promotionType: NonNullable<PromotionType>) {
  const promotion = data.currentPromotion;
  if (!promotion?.isActive || promotion?.type !== promotionType || !promotion?.endDate) {
    return false;
  }

  const endMillis =
    typeof promotion.endDate.toMillis === 'function'
      ? promotion.endDate.toMillis()
      : typeof promotion.endDate.seconds === 'number'
        ? promotion.endDate.seconds * 1000
        : 0;

  return endMillis > Date.now();
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const uid = session?.user?.uid;
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
    const promotionType = body.promotionType;

    if (!propertyId || !isPromotionType(promotionType)) {
      return NextResponse.json({ success: false, message: 'Promotion invalide.' }, { status: 400 });
    }

    if (!adminApp) {
      return NextResponse.json({ success: false, message: 'Firebase admin non initialisé.' }, { status: 500 });
    }

    const db = getFirestore(adminApp);
    const config = PROMOTION_CONFIGS[promotionType];
    const propertyRef = db.collection(firebaseCollectionNames.properties).doc(propertyId);
    const usersQuery = await db.collection(firebaseCollectionNames.users).where('uid', '==', uid).limit(1).get();

    if (usersQuery.empty) {
      return NextResponse.json({ success: false, message: 'Utilisateur introuvable.' }, { status: 404 });
    }

    const userRef = usersQuery.docs[0].ref;
    const transactionRef = db.collection(firebaseCollectionNames.credit_transactions).doc();

    const result = await db.runTransaction(async (transaction) => {
      const [userSnap, propertySnap] = await Promise.all([transaction.get(userRef), transaction.get(propertyRef)]);

      if (!propertySnap.exists) {
        throw new Error('PROPERTY_NOT_FOUND');
      }

      const property = propertySnap.data() ?? {};
      if (property.createdBy !== uid) {
        throw new Error('FORBIDDEN_PROPERTY');
      }

      if (hasActiveSamePromotion(property, promotionType)) {
        throw new Error('SAME_PROMOTION_ACTIVE');
      }

      const user = userSnap.data() ?? {};
      const credits = Number(user.credits ?? 0);
      if (credits < config.credits) {
        throw new Error(`INSUFFICIENT_CREDITS:${credits}`);
      }

      const now = Timestamp.now();
      const endDate =
        config.duration > 0 ? Timestamp.fromMillis(now.toMillis() + config.duration * 24 * 60 * 60 * 1000) : now;
      const nextCredits = credits - config.credits;
      const promotion = {
        type: promotionType,
        startDate: now,
        endDate,
        isActive: true,
        creditsUsed: config.credits,
      };

      transaction.update(userRef, {
        credits: nextCredits,
        updatedAt: now,
      });

      transaction.update(propertyRef, {
        currentPromotion: promotion,
        promotionHistory: FieldValue.arrayUnion(promotion),
        isPromoted: true,
        ...(promotionType === 'boost' ? { lastBoostedAt: now } : {}),
        updatedAt: now,
      });

      transaction.set(transactionRef, {
        uid,
        type: 'spend',
        credits: -Math.abs(config.credits),
        service: config.serviceName,
        propertyId,
        description: `${config.serviceName} - Annonce "${property.title ?? propertyId}"`,
        status: 'success',
        createdAt: now,
        updatedAt: now,
      });

      return { nextCredits, transactionId: transactionRef.id };
    });

    return NextResponse.json({
      success: true,
      promotionType,
      creditsRemaining: result.nextCredits,
      creditsUsed: config.credits,
      transactionId: result.transactionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    logger.error('Promotion activation failed', { error });

    if (message.startsWith('INSUFFICIENT_CREDITS')) {
      const available = Number(message.split(':')[1] ?? 0);
      return NextResponse.json(
        {
          success: false,
          code: 'INSUFFICIENT_CREDITS',
          message: `Crédits insuffisants. Vous avez ${available} crédits.`,
        },
        { status: 402 }
      );
    }

    if (message === 'PROPERTY_NOT_FOUND') {
      return NextResponse.json({ success: false, message: 'Annonce introuvable.' }, { status: 404 });
    }

    if (message === 'FORBIDDEN_PROPERTY') {
      return NextResponse.json({ success: false, message: 'Vous ne pouvez promouvoir que vos annonces.' }, { status: 403 });
    }

    if (message === 'SAME_PROMOTION_ACTIVE') {
      return NextResponse.json({ success: false, message: 'Cette promotion est déjà active.' }, { status: 409 });
    }

    return NextResponse.json(
      { success: false, message: "Une erreur est survenue lors de l'activation de la promotion." },
      { status: 500 }
    );
  }
}
