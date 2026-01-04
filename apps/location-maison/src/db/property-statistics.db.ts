import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { Timestamp } from "firebase/firestore";
import { getPropertyById } from "./property.db";
import { adminApp } from "@/firebase/admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const getFirestore = () => import("@/firebase/firestore");

const getFirestoreAdmin = () => {
  if (!adminApp) {
    throw new Error('Firebase Admin not initialized');
  }
  return getAdminFirestore(adminApp as any);
};

/**
 * Utilitaires
 */
function getScrollDepthRange(depth: number): string {
  if (depth < 25) return '0-25';
  if (depth < 50) return '25-50';
  if (depth < 75) return '50-75';
  if (depth < 100) return '75-100';
  return '100';
}

/**
 * Interface pour les statistiques d'une propriété
 */
export interface PropertyStatistics {
  id?: string; // ID du document Firestore (optionnel)
  // Identifiants
  propertyId: string;
  propertyOwnerId: string;
  
  // Métriques de base
  totalViews: number;
  uniqueViews: number;
  totalContacts: number;
  
  // Timestamps
  firstViewedAt: Timestamp | null;
  lastViewedAt: Timestamp | null;
  lastContactAt: Timestamp | null;
  
  // Analytics temporels
  viewsByDay: Record<string, number>;
  viewsByHour: Record<number, number>;
  viewsByMonth: Record<string, number>;
  
  // Analytics géographiques
  viewsByProvince: Record<string, number>;
  viewsByCity: Record<string, number>;
  
  // Utilisateurs uniques
  uniqueViewers: string[];
  
  // Métriques d'engagement
  averageViewDuration: number;
  totalViewDuration: number;
  scrollDepth: Record<string, number>;
  imageViews: Record<number, number>;
  
  // Statistiques d'interactions
  whatsappContacts: number;
  phoneContacts: number;
  whatsappShares: number;
  facebookShares: number;
  favoriteAdds: number;
  interactionsByDay: Record<string, number>;
  
  // Métriques calculées
  viewsPerDay: number;
  contactRate: number;
  uniqueViewRate: number;
  
  // Métadonnées
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Métadonnées pour le tracking d'une vue
 */
export interface ViewMetadata {
  userId?: string;
  duration?: number;
  scrollDepth?: number;
  imagesViewed?: number[];
  province?: string;
  city?: string;
  userAgent?: string;
  referrer?: string;
}

/**
 * Type d'interaction
 */
export type InteractionType = 
  | 'whatsapp_contact'
  | 'phone_contact'
  | 'whatsapp_share'
  | 'facebook_share'
  | 'native_share'
  | 'favorite_add'
  | 'favorite_remove'
  | 'map_click'
  | 'recommendation_click';

/**
 * Initialise ou récupère les statistiques d'une propriété
 * Utilise Admin SDK pour contourner les règles Firestore
 */
async function getOrCreateStatistics(propertyId: string, propertyOwnerId: string): Promise<PropertyStatistics | null> {
  try {
    // Utiliser Admin SDK
    const db = getFirestoreAdmin();
    const statsRef = db.collection(firebaseCollectionNames.property_statistics).doc(propertyId);
    const statsSnap = await statsRef.get();
    
    if (statsSnap.exists) {
      const data = statsSnap.data();
      if (data) {
        return { id: statsSnap.id, ...data } as PropertyStatistics;
      }
    }
    
    // Créer les statistiques initiales avec Admin SDK
    const FieldValue = await import('firebase-admin/firestore').then(m => m.FieldValue);
    const initialStats = {
      propertyId,
      propertyOwnerId,
      totalViews: 0,
      uniqueViews: 0,
      totalContacts: 0,
      firstViewedAt: null,
      lastViewedAt: null,
      lastContactAt: null,
      viewsByDay: {},
      viewsByHour: {},
      viewsByMonth: {},
      viewsByProvince: {},
      viewsByCity: {},
      uniqueViewers: [],
      averageViewDuration: 0,
      totalViewDuration: 0,
      scrollDepth: {},
      imageViews: {},
      whatsappContacts: 0,
      phoneContacts: 0,
      whatsappShares: 0,
      facebookShares: 0,
      favoriteAdds: 0,
      interactionsByDay: {},
      viewsPerDay: 0,
      contactRate: 0,
      uniqueViewRate: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    await statsRef.set(initialStats);
    // Récupérer le document créé pour obtenir les timestamps convertis en Timestamp
    const createdSnap = await statsRef.get();
    if (createdSnap.exists) {
      const createdData = createdSnap.data();
      if (createdData) {
        return { id: propertyId, ...createdData } as PropertyStatistics;
      }
    }
    // Fallback : retourner null si on ne peut pas récupérer le document
    return null;
  } catch (error) {
    console.error("Error getting or creating statistics:", error);
    return null;
  }
}

/**
 * Enregistre une vue sur une propriété
 * Utilise Admin SDK pour contourner les règles Firestore (appelé depuis API routes)
 */
export async function trackPropertyView(
  propertyId: string,
  metadata?: ViewMetadata
): Promise<boolean> {
  try {
    // Vérifier que la propriété existe
    const property = await getPropertyById(propertyId);
    if (!property || !property.createdBy) {
      return false;
    }

    // Utiliser Admin SDK pour contourner les règles Firestore
    const db = getFirestoreAdmin();
    const statsRef = db.collection(firebaseCollectionNames.property_statistics).doc(propertyId);
    const statsSnap = await statsRef.get();
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hour = now.getHours();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Utiliser FieldValue pour Admin SDK
    const FieldValue = await import('firebase-admin/firestore').then(m => m.FieldValue);
    
    // Première vue - créer le document
    if (!statsSnap.exists) {
      const initialStats = {
        propertyId,
        propertyOwnerId: property.createdBy,
        totalViews: 1,
        uniqueViews: metadata?.userId ? 1 : 0,
        totalContacts: 0,
        firstViewedAt: FieldValue.serverTimestamp(),
        lastViewedAt: FieldValue.serverTimestamp(),
        lastContactAt: null,
        viewsByDay: { [today]: 1 },
        viewsByHour: { [hour]: 1 },
        viewsByMonth: { [month]: 1 },
        viewsByProvince: metadata?.province ? { [metadata.province]: 1 } : {},
        viewsByCity: metadata?.city ? { [metadata.city]: 1 } : {},
        uniqueViewers: metadata?.userId ? [metadata.userId] : [],
        averageViewDuration: metadata?.duration || 0,
        totalViewDuration: metadata?.duration || 0,
        scrollDepth: metadata?.scrollDepth !== undefined ? { [getScrollDepthRange(metadata.scrollDepth)]: 1 } : {},
        imageViews: metadata?.imagesViewed ? metadata.imagesViewed.reduce((acc: Record<number, number>, idx: number) => {
          acc[idx] = 1;
          return acc;
        }, {}) : {},
        whatsappContacts: 0,
        phoneContacts: 0,
        whatsappShares: 0,
        facebookShares: 0,
        favoriteAdds: 0,
        interactionsByDay: {},
        viewsPerDay: 0,
        contactRate: 0,
        uniqueViewRate: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      await statsRef.set(initialStats);
      await calculateMetrics(propertyId);
      return true;
    }
    
    // Mise à jour du document existant avec Admin SDK
    const statsData = statsSnap.data() || {};
    const updates: any = {
      updatedAt: FieldValue.serverTimestamp(),
      totalViews: FieldValue.increment(1),
      lastViewedAt: FieldValue.serverTimestamp(),
    };
    
    // Mise à jour des compteurs temporels
    const viewsByDay = statsData?.viewsByDay || {};
    const viewsByHour = statsData?.viewsByHour || {};
    const viewsByMonth = statsData?.viewsByMonth || {};
    const viewsByProvince = statsData?.viewsByProvince || {};
    const viewsByCity = statsData?.viewsByCity || {};
    
    updates.viewsByDay = {
      ...viewsByDay,
      [today]: (viewsByDay[today] || 0) + 1,
    };
    updates.viewsByHour = {
      ...viewsByHour,
      [hour]: (viewsByHour[hour] || 0) + 1,
    };
    updates.viewsByMonth = {
      ...viewsByMonth,
      [month]: (viewsByMonth[month] || 0) + 1,
    };
    
    if (metadata?.province) {
      updates.viewsByProvince = {
        ...viewsByProvince,
        [metadata.province]: (viewsByProvince[metadata.province] || 0) + 1,
      };
    }
    if (metadata?.city) {
      updates.viewsByCity = {
        ...viewsByCity,
        [metadata.city]: (viewsByCity[metadata.city] || 0) + 1,
      };
    }
    
    // Traitement de l'utilisateur unique
    if (metadata?.userId) {
      const uniqueViewers = statsData?.uniqueViewers || [];
      
      if (!uniqueViewers.includes(metadata.userId)) {
        updates.uniqueViews = FieldValue.increment(1);
        updates.uniqueViewers = FieldValue.arrayUnion(metadata.userId);
      }
    }
    
    // Mise à jour des métriques d'engagement
    if (metadata?.duration) {
      const totalDuration = (statsData?.totalViewDuration || 0) + metadata.duration;
      const totalViews = (statsData?.totalViews || 0) + 1;
      
      updates.totalViewDuration = totalDuration;
      updates.averageViewDuration = Math.round(totalDuration / totalViews);
    }
    
    if (metadata?.scrollDepth !== undefined) {
      const scrollDepth = statsData?.scrollDepth || {};
      const depthRange = getScrollDepthRange(metadata.scrollDepth);
      
      updates.scrollDepth = {
        ...scrollDepth,
        [depthRange]: (scrollDepth[depthRange] || 0) + 1,
      };
    }
    
    if (metadata?.imagesViewed && metadata.imagesViewed.length > 0) {
      const imageViews = statsData?.imageViews || {};
      
      metadata.imagesViewed.forEach((index) => {
        imageViews[index] = (imageViews[index] || 0) + 1;
      });
      
      updates.imageViews = imageViews;
    }
    
    await statsRef.update(updates);
    
    // Recalculer les métriques calculées
    await calculateMetrics(propertyId);
    
    return true;
  } catch (error) {
    console.error("Error tracking property view:", error);
    return false;
  }
}

/**
 * Enregistre une interaction sur une propriété
 */
export async function trackPropertyInteraction(
  propertyId: string,
  type: InteractionType,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const property = await getPropertyById(propertyId);
    if (!property || !property.createdBy) {
      return false;
    }

    const { doc, getDoc, updateDoc, increment, serverTimestamp, db } = await getFirestore();
    const statsRef = doc(db, firebaseCollectionNames.property_statistics, propertyId);
    const statsSnap = await getDoc(statsRef);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const updates: any = {
      updatedAt: serverTimestamp(),
    };
    
    // Initialiser les statistiques si nécessaire
    if (!statsSnap.exists()) {
      await getOrCreateStatistics(propertyId, property.createdBy);
      const newStatsSnap = await getDoc(statsRef);
      if (!newStatsSnap.exists()) return false;
    }
    
    // Mettre à jour selon le type d'interaction
    switch (type) {
      case 'whatsapp_contact':
        updates.whatsappContacts = increment(1);
        updates.totalContacts = increment(1);
        updates.lastContactAt = serverTimestamp();
        break;
      case 'phone_contact':
        updates.phoneContacts = increment(1);
        updates.totalContacts = increment(1);
        updates.lastContactAt = serverTimestamp();
        break;
      case 'whatsapp_share':
        updates.whatsappShares = increment(1);
        break;
      case 'facebook_share':
        updates.facebookShares = increment(1);
        break;
      case 'favorite_add':
        updates.favoriteAdds = increment(1);
        break;
    }
    
    // Mise à jour des interactions par jour
    const statsData = statsSnap.data();
    const interactionsByDay = statsData?.interactionsByDay || {};
    updates.interactionsByDay = {
      ...interactionsByDay,
      [today]: (interactionsByDay[today] || 0) + 1,
    };
    
    await updateDoc(statsRef, updates);
    
    // Recalculer les métriques calculées
    await calculateMetrics(propertyId);
    
    return true;
  } catch (error) {
    console.error("Error tracking property interaction:", error);
    return false;
  }
}

/**
 * Récupère les statistiques complètes d'une propriété
 * Utilise Admin SDK pour contourner les règles Firestore
 */
export async function getPropertyStatistics(
  propertyId: string,
  ownerId: string
): Promise<PropertyStatistics | null> {
  try {
    // Vérifier que l'utilisateur est le propriétaire
    const property = await getPropertyById(propertyId);
    if (!property || property.createdBy !== ownerId) {
      throw new Error('Accès non autorisé');
    }

    // Utiliser Admin SDK pour contourner les règles Firestore
    const db = getFirestoreAdmin();
    const statsRef = db.collection(firebaseCollectionNames.property_statistics).doc(propertyId);
    const statsSnap = await statsRef.get();
    
    if (!statsSnap.exists) {
      // Créer les statistiques si elles n'existent pas
      if (property.createdBy) {
        return await getOrCreateStatistics(propertyId, property.createdBy);
      }
      return null;
    }
    
    const data = statsSnap.data();
    if (!data) {
      return null;
    }
    
    return { id: statsSnap.id, ...data } as PropertyStatistics;
  } catch (error) {
    console.error("Error getting property statistics:", error);
    return null;
  }
}

/**
 * Recalcule les métriques calculées
 */
async function calculateMetrics(propertyId: string): Promise<void> {
  try {
    // Utiliser Admin SDK
    const db = getFirestoreAdmin();
    const statsRef = db.collection(firebaseCollectionNames.property_statistics).doc(propertyId);
    const statsSnap = await statsRef.get();
    
    if (!statsSnap.exists) return;
    
    const stats = statsSnap.data() as PropertyStatistics;
    const property = await getPropertyById(propertyId);
    
    if (!property || !property.createdAt) return;
    
    // Calculer les jours en ligne
    const createdAt = property.createdAt as Timestamp;
    const now = Date.now();
    const createdTime = createdAt.toMillis ? createdAt.toMillis() : createdAt.seconds * 1000;
    const daysOnline = Math.max(1, Math.ceil((now - createdTime) / (1000 * 60 * 60 * 24)));
    
    // Calculer les métriques
    const viewsPerDay = stats.totalViews > 0 ? stats.totalViews / daysOnline : 0;
    const contactRate = stats.totalViews > 0 ? (stats.totalContacts / stats.totalViews) * 100 : 0;
    const uniqueViewRate = stats.totalViews > 0 ? (stats.uniqueViews / stats.totalViews) * 100 : 0;
    
    const FieldValue = await import('firebase-admin/firestore').then(m => m.FieldValue);
    await statsRef.update({
      viewsPerDay: Math.round(viewsPerDay * 100) / 100,
      contactRate: Math.round(contactRate * 100) / 100,
      uniqueViewRate: Math.round(uniqueViewRate * 100) / 100,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error calculating metrics:", error);
  }
}
