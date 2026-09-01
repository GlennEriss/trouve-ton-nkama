import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';

import { adminApp } from '@/firebase/admin';
import { auth } from '@/next-auth/auth';
import { createLogger } from '@/lib/logger';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { invalidatePropertySeoCache } from '@/lib/invalidate-property-seo-cache';

const logger = createLogger('api.property');

// Champs qu'un simple "Modifier" (crayon EditableField, formulaire de mise à jour) ne doit
// jamais pouvoir écraser — propriété de l'annonce et decision de modération, gérées par des
// routes/flux dédiés (promotion, review admin), pas par un patch générique.
const PROTECTED_FIELDS = new Set(['createdBy', 'claimedBy', 'id', 'currentPromotion']);

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

/**
 * Mise à jour d'une annonce — Admin SDK côté serveur, même raison que DELETE ci-dessus.
 *
 * updateProperty() (src/db/property.db.ts) passait par updateModel() (SDK Firestore CLIENT,
 * updateDoc), qui exige une vraie session Firebase Auth dans le navigateur
 * (firestore.rules: `allow update: if isAnnouncer() && request.auth.uid == ...`) — jamais
 * disponible, même bug que la suppression. Constaté en e2e réel en écrivant le test de
 * sauvegarde des crayons d'EditableField (property-edit.spec.ts) : la mise à jour du state
 * React local donnait l'illusion d'un succès (aucune erreur affichée, la nouvelle valeur
 * visible à l'écran), alors que `updateDoc` échouait silencieusement en arrière-plan
 * (`FirebaseError: Missing or insufficient permissions.`) et que Firestore gardait l'ancienne
 * valeur — donc a priori cassé pour toute sauvegarde de propriété depuis la création de cette
 * fonctionnalité, pas seulement pour l'immobilier.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    let patch: Record<string, unknown>;
    try {
      patch = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Corps de requête invalide.' }, { status: 400 });
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return NextResponse.json({ success: false, message: 'Corps de requête invalide.' }, { status: 400 });
    }

    const safePatch = Object.fromEntries(
      Object.entries(patch).filter(([key]) => !PROTECTED_FIELDS.has(key)),
    );
    if (Object.keys(safePatch).length === 0) {
      return NextResponse.json({ success: false, message: 'Aucun champ à mettre à jour.' }, { status: 400 });
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
        { success: false, message: 'Vous ne pouvez modifier que vos propres annonces.' },
        { status: 403 },
      );
    }

    await propertyRef.update({ ...safePatch, updatedAt: new Date() });

    try {
      await invalidatePropertySeoCache();
    } catch (cacheError) {
      logger.warn('Failed to invalidate SEO cache after update', { propertyId, error: cacheError });
    }

    logger.info('Property updated', { propertyId, uid, fields: Object.keys(safePatch) });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to update property', { error });
    return NextResponse.json(
      { success: false, message: 'Une erreur est survenue lors de la mise à jour.' },
      { status: 500 },
    );
  }
}
