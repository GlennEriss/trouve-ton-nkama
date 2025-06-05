/**
 * Types pour le système de paiement Airtel Money
 */

export interface CreditPack {
  id: string
  name: string
  credits: number
  price: number
  savings?: number
}

export interface PurchaseRequest {
  userId: string
  packId: string
  userPhone?: string
  userEmail?: string
}

export interface AirtelPaymentRequest {
  reference: string
  subscriber_msisdn: string
  amount: number
  country: string
  currency: string
  transaction: {
    amount: number
    country: string
    currency: string
    id: string
  }
}

export interface AirtelPaymentResponse {
  status: {
    code: string
    message: string
    result_code: string
    success: boolean
  }
  data?: {
    transaction: {
      airtel_money_id: string
      id: string
      message: string
      status: string
    }
  }
}

export interface WebhookPayload {
  transaction: {
    airtel_money_id: string
    id: string
    message: string
    status: string
    amount: number
    currency: string
  }
  reference: string
  timestamp: string
  signature: string
}

export interface CreditTransaction {
  id: string
  userId: string
  type?: 'purchase' | 'spend'  // Nouveau champ pour l'historique
  packId?: string             // Optionnel pour les dépenses
  credits: number
  amount?: number             // Optionnel pour les dépenses
  service?: string           // Pour les dépenses (boost, mise à la une, etc.)
  status: 'pending' | 'success' | 'failed' | 'cancelled'
  provider?: 'airtel_money'
  description?: string       // Description pour l'historique
  
  // Données Airtel Money
  airtelTransactionId?: string
  airtelMoneyId?: string
  
  // Données pour les dépenses
  propertyId?: string        // ID de l'annonce concernée
  
  // Métadonnées
  phoneNumber?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  failureReason?: string
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 5,
    price: 2000
  },
  {
    id: 'standard',
    name: 'Standard',
    credits: 10,
    price: 3500,
    savings: 12.5
  },
  {
    id: 'advanced',
    name: 'Avancé',
    credits: 25,
    price: 7500,
    savings: 25
  },
  {
    id: 'premium',
    name: 'Premium',
    credits: 50,
    price: 12500,
    savings: 37.5
  }
] 