import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';

import { adminApp } from '@/firebase/admin';
import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { invalidatePropertySeoCache } from '@/lib/invalidate-property-seo-cache';

const logger = createLogger('api.property.delete');

/**
 * Suppression d'une annonce — Admin SDK côté serveur.
 *
 * deleteProperty() (src/db/property.db.ts) passait jusqu'ici par le SDK Firestore CLIENT
 * (deleteDoc), qui exige une vraie session Firebase Auth dans le NAVIGATEUR
 * (firestore.rules: `allow delete: if isAnnouncer() && request.auth.uid == ...`). Or ni
 * Google (credential échangé côté serveur) ni la connexion email/mot de passe (Credentials
 * provider de NextAuth, dont `authorize()` tourne aussi côté serveur) ne laissent jamais le
 * navigateur avec une session Firebase Auth réelle — même bug que la création de compte
 * téléphone et la finalisation de profil, déjà corrigées plus tôt. Constaté en e2e réel :
 * le bouton "Supprimer" restait bloqué 30 à 60s avant d'afficher une erreur, sans jamais
 * supprimer l'annonce, pour la quasi-totalité des utilisateurs réels.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const uid = session?.user?.uid;
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });
    }

    const { id: propertyId } = await params;
    if (!propertyId) {
      return NextResponse.json({ success: false, message: 'Identifiant manquant.' }, { status: 400 });
    }

    if (!adminApp) {
      return NextResponse.json({ success: false, message: 'Firebase admin non initialisé.' }, { status: 500 });
    }

    const db = getFirestore(adminApp);
    const propertyRef = db.collection(firebaseCollectionNames.properties).doc(propertyId);
    const snapshot = await propertyRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ success: false, message: 'Annonce introuvable.' }, { status: 404 });
    }

    const property = snapshot.data() ?? {};
    const isOwner = property.createdBy === uid || property.claimedBy === uid;
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: 'Vous ne pouvez supprimer que vos propres annonces.' },
        { status: 403 },
      );
    }

    await propertyRef.delete();

    try {
      await invalidatePropertySeoCache();
    } catch (cacheError) {
      logger.warn('Failed to invalidate SEO cache after delete', { propertyId, error: cacheError });
    }

    logger.info('Property deleted', { propertyId, uid });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete property', { error });
    return NextResponse.json(
      { success: false, message: "Une erreur est survenue lors de la suppression." },
      { status: 500 },
    );
  }
}
