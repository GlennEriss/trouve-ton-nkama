/**
 * Types partagés pour les transactions de crédits
 * Utilisé par le système de paiements ET l'historique
 */

export interface CreditPack {
    id: string
    name: string
    credits: number
    price: number
    savings?: number
  }
  
  export interface CreditTransaction {
    id: string
    userId: string
    type?: 'purchase' | 'spend'  // Pour l'historique (optionnel pour rétrocompatibilité)
    packId?: string             // ID du pack acheté (pour les achats)
    credits: number
    amount?: number             // Montant en FCFA
    service?: string           // Service utilisé (pour les dépenses)
    status: 'pending' | 'success' | 'failed' | 'cancelled'
    provider?: 'airtel_money'  // Fournisseur de paiement
    description?: string       // Description de la transaction
    
    // Données Airtel Money
    airtelTransactionId?: string  // ID transaction Airtel
    airtelMoneyId?: string       // ID Airtel Money
    transactionId?: string       // Alias pour airtelTransactionId
    
    // Données pour les dépenses
    propertyId?: string         // ID de l'annonce (pour les dépenses)
    
    // Métadonnées
    phoneNumber?: string
    createdAt: any             // Timestamp Firestore ou Date
    updatedAt: any             // Timestamp Firestore ou Date
    completedAt?: any          // Timestamp Firestore ou Date
    failureReason?: string
  }
  
  export interface CreditTransactionInput {
    userId: string
    type?: 'purchase' | 'spend'
    packId?: string
    credits: number
    amount?: number
    service?: string
    status: 'pending' | 'success' | 'failed' | 'cancelled'
    description?: string
    provider?: 'airtel_money'
    airtelTransactionId?: string
    airtelMoneyId?: string
    transactionId?: string
    propertyId?: string
    phoneNumber?: string
    failureReason?: string
  }
  
  export interface GetHistoryOptions {
    type?: 'all' | 'purchase' | 'spend'
    limit?: number
    startAfter?: any
  }
  
  export interface HistoryResponse {
    transactions: CreditTransaction[]
    hasMore: boolean
    lastVisible?: any
    total: number
  }
  
  export interface PurchaseRequest {
    userId: string
    packId: string
    userPhone?: string
    userEmail?: string
  }