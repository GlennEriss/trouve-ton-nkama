/**
 * Configuration Airtel Money
 */

export const AIRTEL_CONFIG = {
  // URLs API (staging UAT et production)
  STAGING_BASE_URL: 'https://openapiuat.airtel.africa/merchant/v1',
  PRODUCTION_BASE_URL: 'https://openapi.airtel.africa/merchant/v1',
  
  // Endpoints
  ENDPOINTS: {
    INITIATE_PAYMENT: '/payments/',
    PAYMENT_STATUS: '/payments/status/',
    TOKEN: '/auth/oauth2/token'
  },
  
  // Configuration par pays (Gabon)
  COUNTRY: 'GA',
  CURRENCY: 'XAF', // Franc CFA
  
  // Timeouts
  REQUEST_TIMEOUT: 30000, // 30 secondes
  
  // Statuts de transaction Airtel
  TRANSACTION_STATUS: {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED'
  }
}

/**
 * Récupère les variables d'environnement Airtel Money
 */
export function getAirtelCredentials() {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return {
    clientId: process.env.AIRTEL_CLIENT_ID!,
    clientSecret: process.env.AIRTEL_CLIENT_SECRET!,
    merchantId: process.env.AIRTEL_MERCHANT_ID!,
    baseUrl: isProduction 
      ? AIRTEL_CONFIG.PRODUCTION_BASE_URL 
      : AIRTEL_CONFIG.STAGING_BASE_URL,
    isProduction,
    webhookSecret: process.env.AIRTEL_WEBHOOK_SECRET!
  }
}

/**
 * Génère un ID de transaction unique
 */
export function generateTransactionId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `TXN_${timestamp}_${random}`.toUpperCase()
}

/**
 * Valide un numéro de téléphone Airtel Gabon
 */
export function validateAirtelNumber(phoneNumber: string): boolean {
  // Format: +241 XX XX XX XX ou 241XXXXXXXX ou XXXXXXXXX
  const gabonAirtelRegex = /^(\+241|241)?[67]\d{7}$/
  const cleanNumber = phoneNumber.replace(/\s+/g, '')
  return gabonAirtelRegex.test(cleanNumber)
}

/**
 * Formate un numéro de téléphone pour Airtel
 */
export function formatPhoneNumber(phoneNumber: string): string {
  let cleanNumber = phoneNumber.replace(/\s+/g, '')
  
  // Ajouter le code pays si nécessaire
  if (!cleanNumber.startsWith('241')) {
    if (cleanNumber.startsWith('+241')) {
      cleanNumber = cleanNumber.substring(1)
    } else if (cleanNumber.length === 8) {
      cleanNumber = '241' + cleanNumber
    }
  }
  
  return cleanNumber
} 