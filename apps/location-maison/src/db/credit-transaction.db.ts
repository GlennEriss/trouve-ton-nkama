import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { CreditTransaction, CreditTransactionInput, GetHistoryOptions, HistoryResponse } from "@/models/credit-transaction";
import { createLogger } from '@/lib/logger';


const getFirestore = () => import("@/firebase/firestore");
const logger = createLogger('db.credit-transaction');

/**
 * Génère le suffixe d'annonce si propertyId est présent
 */
function generatePropertySuffix(propertyId?: string): string {
  return propertyId ? ` - Annonce ${propertyId}` : '';
}

/**
 * Récupère l'historique des transactions de crédits pour un utilisateur
 */
export async function getCreditHistoryByUserId(
  userId: string,
  options: GetHistoryOptions = {}
): Promise<HistoryResponse> {
  try {
    const { collection, db, getDocs, query, where, orderBy, limit, startAfter } = await getFirestore();
    const { type, limit: pageLimit = 10, startAfter: cursor } = options;

    const collectionRef = collection(db, firebaseCollectionNames.credit_transactions);
    
    // Construction de la query
    let q = query(
      collectionRef,
      where("uid", "==", userId),
      orderBy("createdAt", "desc")
    );

    // Filtrage par type si spécifié
    if (type && type !== 'all') {
      q = query(
        collectionRef,
        where("uid", "==", userId),
        where("type", "==", type),
        orderBy("createdAt", "desc")
      );
    }

    // Pagination
    q = query(q, limit(pageLimit + 1)); // +1 pour détecter s'il y a plus de données

    // Cursor pour pagination
    if (cursor) {
      q = query(q, startAfter(cursor));
    }

    const querySnapshot = await getDocs(q);
    const transactions: CreditTransaction[] = [];
    let lastVisible = null;

    querySnapshot.docs.forEach((doc, index) => {
      if (index < pageLimit) {
        const data = doc.data();
        
        // Mapper les anciens champs vers le nouveau format si nécessaire
        transactions.push({
          id: doc.id,
          ...data,
          // S'assurer que le type est défini pour l'historique
          type: data.type ?? (data.packId ? 'purchase' : 'spend'),
          // Mapper les anciens champs Airtel Money
          transactionId: data.transactionId ?? data.airtelTransactionId,
          description: data.description ?? generateDescription(data)
        } as CreditTransaction);
        lastVisible = doc;
      }
    });

    // Vérifier s'il y a plus de données
    const hasMore = querySnapshot.docs.length > pageLimit;

    // Compter le total (pour l'affichage)
    const total = await getCreditTransactionCount(userId, type);

    return {
      transactions,
      hasMore,
      lastVisible,
      total
    };
  } catch (error) {
    logger.error('Error fetching credit history', { userId, options, error });
    throw new Error("Erreur lors de la récupération de l'historique");
  }
}

/**
 * Génère une description pour les anciennes transactions
 */
function generateDescription(data: any): string {
  if (data.description) return data.description;
  
  if (data.packId) {
    const packNames: Record<string, string> = {
      'starter': 'Pack Starter',
      'standard': 'Pack Standard', 
      'advanced': 'Pack Avancé',
      'premium': 'Pack Premium'
    };
    return `Achat ${packNames[data.packId] ?? 'pack de crédits'}`;
  }
  
  if (data.service) {
    return data.service + generatePropertySuffix(data.propertyId);
  }
  
  return data.credits > 0 ? 'Achat de crédits' : 'Utilisation de crédits';
}

/**
 * Crée une nouvelle transaction de crédit
 */
export async function createCreditTransaction(transaction: CreditTransactionInput): Promise<string> {
  try {
    const { collection, db, addDoc, serverTimestamp } = await getFirestore();
    const collectionRef = collection(db, firebaseCollectionNames.credit_transactions);

    const docRef = await addDoc(collectionRef, {
      ...transaction,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  } catch (error) {
    logger.error('Error creating credit transaction', { transaction, error });
    throw new Error("Erreur lors de la création de la transaction");
  }
}

/**
 * Met à jour le statut d'une transaction
 */
export async function updateTransactionStatus(
  transactionId: string, 
  status: 'success' | 'pending' | 'failed' | 'cancelled'
): Promise<boolean> {
  try {
    const { db, doc, updateDoc, serverTimestamp } = await getFirestore();
    const transactionRef = doc(db, firebaseCollectionNames.credit_transactions, transactionId);

    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (status === 'success') {
      updateData.completedAt = serverTimestamp();
    }

    await updateDoc(transactionRef, updateData);

    return true;
  } catch (error) {
    logger.error('Error updating transaction status', { transactionId, status, error });
    return false;
  }
}

/**
 * Compte le nombre total de transactions pour un utilisateur
 */
export async function getCreditTransactionCount(
  userId: string, 
  type?: 'all' | 'purchase' | 'spend'
): Promise<number> {
  try {
    const { collection, db, getCountFromServer, query, where } = await getFirestore();
    const collectionRef = collection(db, firebaseCollectionNames.credit_transactions);

    let q = query(collectionRef, where("uid", "==", userId));

    // Filtrage par type si spécifié
    if (type && type !== 'all') {
      q = query(q, where("type", "==", type));
    }

    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    logger.error('Error counting transactions', { userId, type, error });
    return 0;
  }
}

/**
 * Récupère une transaction par son ID
 */
export async function getCreditTransactionById(transactionId: string): Promise<CreditTransaction | null> {
  try {
    const { db, doc, getDoc } = await getFirestore();
    const transactionRef = doc(db, firebaseCollectionNames.credit_transactions, transactionId);
    const docSnap = await getDoc(transactionRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        type: data.type ?? (data.packId ? 'purchase' : 'spend'),
        transactionId: data.transactionId ?? data.airtelTransactionId,
        description: data.description ?? generateDescription(data)
      } as CreditTransaction;
    }

    return null;
  } catch (error) {
    logger.error('Error fetching transaction by ID', { transactionId, error });
    return null;
  }
}

/**
 * Récupère les statistiques des transactions pour un utilisateur
 */
export async function getCreditTransactionStats(userId: string): Promise<{
  totalPurchases: number
  totalSpent: number
  totalCreditsUsed: number
  totalAmountSpent: number
}> {
  try {
    const { collection, db, getDocs, query, where } = await getFirestore();
    const collectionRef = collection(db, firebaseCollectionNames.credit_transactions);
    
    const q = query(collectionRef, where("uid", "==", userId));
    const querySnapshot = await getDocs(q);

    let totalPurchases = 0;
    let totalSpent = 0;
    let totalCreditsUsed = 0;
    let totalAmountSpent = 0;

    querySnapshot.docs.forEach((doc) => {
      const transaction = doc.data() as CreditTransaction;
      
      if (transaction.status === 'success') {
        const type = transaction.type ?? (transaction.packId ? 'purchase' : 'spend');
        
        if (type === 'purchase') {
          totalPurchases += transaction.credits;
          if (transaction.amount) {
            totalAmountSpent += transaction.amount;
          }
        } else if (type === 'spend') {
          totalSpent += Math.abs(transaction.credits);
          totalCreditsUsed += Math.abs(transaction.credits);
        }
      }
    });

    return {
      totalPurchases,
      totalSpent,
      totalCreditsUsed,
      totalAmountSpent
    };
  } catch (error) {
    logger.error('Error fetching transaction stats', { userId, error });
    return {
      totalPurchases: 0,
      totalSpent: 0,
      totalCreditsUsed: 0,
      totalAmountSpent: 0
    };
  }
}

/**
 * Crée une transaction de dépense de crédits
 */
export async function createSpendTransaction(
  userId: string,
  credits: number,
  service: string,
  propertyId?: string,
  description?: string
): Promise<string> {
  try {
    const defaultDescription = service + generatePropertySuffix(propertyId);
    
    const transactionData: CreditTransactionInput = {
      uid: userId,
      type: 'spend',
      credits: -Math.abs(credits), // Négatif pour les dépenses
      service,
      status: 'success', // Les dépenses sont immédiates
      description: description ?? defaultDescription,
      propertyId
    };

    return await createCreditTransaction(transactionData);
  } catch (error) {
    logger.error('Error creating spend transaction', { userId, credits, service, propertyId, error });
    throw new Error("Erreur lors de la création de la transaction de dépense");
  }
}

/**
 * Fonction utilitaire pour déduire des crédits et créer la transaction
 */
export async function deductCreditsWithTransaction(
  userId: string,
  credits: number,
  service: string,
  propertyId?: string,
  description?: string
): Promise<{transactionId: string, success: boolean}> {
  try {
    logger.info('deductCreditsWithTransaction called', { userId, credits, service, propertyId, description });
    
    const { runTransaction, doc, serverTimestamp } = await getFirestore();
    const { collection, db, where, query, getDocs } = await getFirestore();
    
    return await runTransaction(db, async (transaction) => {
      logger.debug('Starting atomic credit deduction transaction', { userId, credits });
      
      // Trouver le document utilisateur
      const usersCollection = collection(db, firebaseCollectionNames.users);
      const userQuery = query(usersCollection, where("uid", "==", userId));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        logger.error('Utilisateur introuvable avec uid', { userId });
        throw new Error('Utilisateur introuvable');
      }
      
      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      const currentCredits = userData.credits ?? 0;
      
      logger.debug('Current user credits before deduction', { currentCredits, credits });
      
      if (currentCredits < credits) {
        logger.warn('Solde insuffisant', { available: currentCredits, required: credits });
        throw new Error('Solde de crédits insuffisant');
      }
      
      // Déduire les crédits
      const newCredits = currentCredits - credits;
      logger.debug('Updating user credit balance', { newCredits });
      
      transaction.update(userDoc.ref, {
        credits: newCredits,
        updatedAt: serverTimestamp()
      });
      
      // Créer la transaction de dépense
      const defaultDescription = service + generatePropertySuffix(propertyId);
      
      const transactionData: CreditTransactionInput = {
        uid: userId,
        type: 'spend',
        credits: -Math.abs(credits),
        service,
        status: 'success',
        description: description ?? defaultDescription
      };

      // Ajouter propertyId seulement s'il est défini
      if (propertyId) {
        transactionData.propertyId = propertyId;
      }
      
      logger.debug('Credit spend transaction payload', { transactionData });
      
      const transactionRef = doc(collection(db, firebaseCollectionNames.credit_transactions));
      logger.debug('Credit transaction collection used', { collection: firebaseCollectionNames.credit_transactions });
      logger.debug('Credit transaction ref created', { transactionRefId: transactionRef.id });
      
      transaction.set(transactionRef, {
        ...transactionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      logger.info('Credit transaction created successfully', { transactionId: transactionRef.id });
      
      return {
        transactionId: transactionRef.id,
        success: true
      };
    });
    
  } catch (error) {
    logger.error('Error deducting credits', { userId, credits, service, propertyId, error });
    throw error;
  }
}

// Réexporter les types pour la compatibilité
export type { CreditTransaction, CreditTransactionInput, GetHistoryOptions, HistoryResponse }; 
