/**
 * Factory pour la création de mocks Transaction (Crédits)
 * Utilise le pattern Factory pour générer des données de test cohérentes
 */

import { Timestamp } from 'firebase/firestore';

// Types
type PurchaseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
type PaymentMethod = 'AIRTEL_MONEY' | 'FREE_CREDITS' | 'ADMIN_GRANT';
type ExpenseService = 'PROPERTY_PUBLISH' | 'PROMOTION_FEATURED' | 'PROMOTION_TRENDING' | 'PROMOTION_BOOST' | 'AI_GENERATION';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceXAF: number;
  discount: number;
  isActive: boolean;
}

interface CreditPurchase {
  id: string;
  userId: string;
  packId: string;
  credits: number;
  amountXAF: number;
  status: PurchaseStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  phoneNumber?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  failureReason?: string;
}

interface CreditExpense {
  id: string;
  userId: string;
  credits: number;
  service: ExpenseService;
  referenceId?: string;
  description: string;
  createdAt: Timestamp;
}

interface CreditWallet {
  userId: string;
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  lastUpdated: Timestamp;
}

/**
 * Factory pour créer des packs de crédits
 */
export class CreditPackFactory {
  private static packs: CreditPack[] = [
    { id: 'pack-starter', name: 'Pack Starter', credits: 5, priceXAF: 5000, discount: 0, isActive: true },
    { id: 'pack-basic', name: 'Pack Basic', credits: 15, priceXAF: 12000, discount: 20, isActive: true },
    { id: 'pack-pro', name: 'Pack Pro', credits: 50, priceXAF: 35000, discount: 30, isActive: true },
    { id: 'pack-premium', name: 'Pack Premium', credits: 100, priceXAF: 60000, discount: 40, isActive: true },
  ];

  static getAll(): CreditPack[] {
    return [...this.packs];
  }

  static getById(id: string): CreditPack | undefined {
    return this.packs.find(p => p.id === id);
  }

  static getStarter(): CreditPack {
    return this.packs[0];
  }

  static getBasic(): CreditPack {
    return this.packs[1];
  }

  static getPro(): CreditPack {
    return this.packs[2];
  }

  static getPremium(): CreditPack {
    return this.packs[3];
  }

  static create(overrides: Partial<CreditPack> = {}): CreditPack {
    return {
      id: 'pack-custom',
      name: 'Pack Custom',
      credits: 10,
      priceXAF: 8000,
      discount: 0,
      isActive: true,
      ...overrides,
    };
  }
}

/**
 * Factory pour créer des achats de crédits
 */
export class CreditPurchaseFactory {
  private static counter = 0;

  static reset(): void {
    this.counter = 0;
  }

  /**
   * Crée un achat de crédits
   */
  static create(overrides: Partial<CreditPurchase> = {}): CreditPurchase {
    this.counter++;
    const pack = CreditPackFactory.getStarter();

    return {
      id: `purchase-${this.counter}`,
      userId: 'user-1',
      packId: pack.id,
      credits: pack.credits,
      amountXAF: pack.priceXAF,
      status: 'PENDING',
      paymentMethod: 'AIRTEL_MONEY',
      phoneNumber: '+24177000000',
      createdAt: Timestamp.now(),
      ...overrides,
    };
  }

  /**
   * Crée un achat en attente
   */
  static createPending(overrides: Partial<CreditPurchase> = {}): CreditPurchase {
    return this.create({
      status: 'PENDING',
      ...overrides,
    });
  }

  /**
   * Crée un achat en cours de traitement
   */
  static createProcessing(overrides: Partial<CreditPurchase> = {}): CreditPurchase {
    return this.create({
      status: 'PROCESSING',
      paymentReference: `AIRTEL-${Date.now()}`,
      ...overrides,
    });
  }

  /**
   * Crée un achat complété
   */
  static createCompleted(overrides: Partial<CreditPurchase> = {}): CreditPurchase {
    const now = Timestamp.now();
    return this.create({
      status: 'COMPLETED',
      paymentReference: `AIRTEL-${Date.now()}`,
      completedAt: now,
      ...overrides,
    });
  }

  /**
   * Crée un achat échoué
   */
  static createFailed(reason: string = 'Solde insuffisant', overrides: Partial<CreditPurchase> = {}): CreditPurchase {
    return this.create({
      status: 'FAILED',
      failureReason: reason,
      ...overrides,
    });
  }

  /**
   * Crée un achat remboursé
   */
  static createRefunded(overrides: Partial<CreditPurchase> = {}): CreditPurchase {
    return this.create({
      status: 'REFUNDED',
      paymentReference: `AIRTEL-${Date.now()}`,
      completedAt: Timestamp.now(),
      ...overrides,
    });
  }

  /**
   * Crée un achat via crédits gratuits (admin)
   */
  static createFreeCredits(credits: number, overrides: Partial<CreditPurchase> = {}): CreditPurchase {
    return this.create({
      packId: 'free-grant',
      credits,
      amountXAF: 0,
      status: 'COMPLETED',
      paymentMethod: 'ADMIN_GRANT',
      completedAt: Timestamp.now(),
      ...overrides,
    });
  }
}

/**
 * Factory pour créer des dépenses de crédits
 */
export class CreditExpenseFactory {
  private static counter = 0;

  static reset(): void {
    this.counter = 0;
  }

  /**
   * Crée une dépense de crédits
   */
  static create(overrides: Partial<CreditExpense> = {}): CreditExpense {
    this.counter++;

    return {
      id: `expense-${this.counter}`,
      userId: 'user-1',
      credits: 1,
      service: 'AI_GENERATION',
      description: 'Utilisation assistant IA',
      createdAt: Timestamp.now(),
      ...overrides,
    };
  }

  /**
   * Crée une dépense pour l'assistant IA
   */
  static createAIUsage(overrides: Partial<CreditExpense> = {}): CreditExpense {
    return this.create({
      credits: 1,
      service: 'AI_GENERATION',
      description: 'Génération de description par IA',
      ...overrides,
    });
  }

  /**
   * Crée une dépense pour promotion Featured
   */
  static createFeaturedPromotion(propertyId: string, overrides: Partial<CreditExpense> = {}): CreditExpense {
    return this.create({
      credits: 10,
      service: 'PROMOTION_FEATURED',
      referenceId: propertyId,
      description: 'Mise en avant de l\'annonce',
      ...overrides,
    });
  }

  /**
   * Crée une dépense pour promotion Trending
   */
  static createTrendingPromotion(propertyId: string, days: 3 | 7 = 7, overrides: Partial<CreditExpense> = {}): CreditExpense {
    return this.create({
      credits: days === 7 ? 7 : 4,
      service: 'PROMOTION_TRENDING',
      referenceId: propertyId,
      description: `Tendance ${days} jours`,
      ...overrides,
    });
  }

  /**
   * Crée une dépense pour boost
   */
  static createBoost(propertyId: string, overrides: Partial<CreditExpense> = {}): CreditExpense {
    return this.create({
      credits: 2,
      service: 'PROMOTION_BOOST',
      referenceId: propertyId,
      description: 'Boost de visibilité',
      ...overrides,
    });
  }
}

/**
 * Factory pour créer des portefeuilles de crédits
 */
export class CreditWalletFactory {
  /**
   * Crée un portefeuille de crédits
   */
  static create(userId: string, overrides: Partial<CreditWallet> = {}): CreditWallet {
    return {
      userId,
      balance: 3, // Crédits de bienvenue
      totalPurchased: 0,
      totalSpent: 0,
      lastUpdated: Timestamp.now(),
      ...overrides,
    };
  }

  /**
   * Crée un portefeuille vide
   */
  static createEmpty(userId: string): CreditWallet {
    return this.create(userId, {
      balance: 0,
      totalPurchased: 0,
      totalSpent: 0,
    });
  }

  /**
   * Crée un portefeuille avec un historique d'achats
   */
  static createWithHistory(userId: string, purchased: number, spent: number): CreditWallet {
    return this.create(userId, {
      balance: purchased - spent,
      totalPurchased: purchased,
      totalSpent: spent,
    });
  }

  /**
   * Crée un portefeuille riche (pour tests admin)
   */
  static createRich(userId: string): CreditWallet {
    return this.create(userId, {
      balance: 999,
      totalPurchased: 999,
      totalSpent: 0,
    });
  }
}

export default {
  CreditPackFactory,
  CreditPurchaseFactory,
  CreditExpenseFactory,
  CreditWalletFactory,
};

