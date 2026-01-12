/**
 * Factory pour la création de mocks User
 * Utilise le pattern Factory pour générer des données de test cohérentes
 */

import { Timestamp } from 'firebase/firestore';

// Types temporaires en attendant la migration vers l'anglais
type UserRole = 'Admin' | 'Announcer';
type AuthProvider = 'GOOGLE' | 'FACEBOOK' | 'CREDENTIALS';
type EntityState = 'IN_PROGRESS' | 'ARCHIVED';

interface NotificationSettings {
  isNew: boolean;
  isAccountActivity: boolean;
  isNewAnnouncement: boolean;
  isFavorites: boolean;
  isPersonalizedSuggestions: boolean;
  isSystemUpdated: boolean;
}

interface User {
  id: string;
  uid: string;
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate?: string;
  country?: { name: string; code: string };
  phoneNumbers: string[];
  phoneNumberVerified: boolean;
  avatarUrl?: string;
  roles: UserRole[];
  emailVerified: boolean;
  providers: AuthProvider[];
  favorites: string[];
  notificationSettings: NotificationSettings;
  darkMode: boolean;
  state: EntityState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface CreditWallet {
  userId: string;
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  lastUpdated: Timestamp;
}

/**
 * Factory pour créer des utilisateurs de test
 */
export class UserFactory {
  private static counter = 0;

  /**
   * Réinitialise le compteur (utile pour les tests)
   */
  static reset(): void {
    this.counter = 0;
  }

  /**
   * Crée un utilisateur de base avec des valeurs par défaut
   */
  static create(overrides: Partial<User> = {}): User {
    this.counter++;
    const now = Timestamp.now();

    return {
      id: `user-${this.counter}`,
      uid: `uid-${this.counter}`,
      login: `user${this.counter}@test.com`,
      firstName: 'Test',
      lastName: `User${this.counter}`,
      email: `user${this.counter}@test.com`,
      phoneNumbers: ['+24177000000'],
      phoneNumberVerified: false,
      roles: [],
      emailVerified: true,
      providers: ['CREDENTIALS'],
      favorites: [],
      notificationSettings: this.createNotificationSettings(),
      darkMode: false,
      state: 'IN_PROGRESS',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  /**
   * Crée un utilisateur "Chercheur" (recherche de logements)
   */
  static createSearcher(overrides: Partial<User> = {}): User {
    return this.create({
      ...overrides,
    });
  }

  /**
   * Crée un utilisateur "Annonceur" (publie des annonces)
   */
  static createAnnouncer(overrides: Partial<User> = {}): User {
    return this.create({
      roles: ['Announcer'],
      ...overrides,
    });
  }

  /**
   * Crée un utilisateur "Administrateur"
   */
  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      roles: ['Admin', 'Announcer'],
      emailVerified: true,
      phoneNumberVerified: true,
      ...overrides,
    });
  }

  /**
   * Crée un utilisateur avec authentification Google
   */
  static createGoogleUser(overrides: Partial<User> = {}): User {
    return this.create({
      providers: ['GOOGLE'],
      emailVerified: true,
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
      ...overrides,
    });
  }

  /**
   * Crée un utilisateur avec authentification Facebook
   */
  static createFacebookUser(overrides: Partial<User> = {}): User {
    return this.create({
      providers: ['FACEBOOK'],
      emailVerified: true,
      avatarUrl: 'https://graph.facebook.com/picture',
      ...overrides,
    });
  }

  /**
   * Crée un utilisateur non vérifié (email non confirmé)
   */
  static createUnverified(overrides: Partial<User> = {}): User {
    return this.create({
      emailVerified: false,
      phoneNumberVerified: false,
      ...overrides,
    });
  }

  /**
   * Crée les paramètres de notification par défaut
   */
  static createNotificationSettings(overrides: Partial<NotificationSettings> = {}): NotificationSettings {
    return {
      isNew: true,
      isAccountActivity: true,
      isNewAnnouncement: true,
      isFavorites: true,
      isPersonalizedSuggestions: true,
      isSystemUpdated: true,
      ...overrides,
    };
  }

  /**
   * Crée un portefeuille de crédits
   */
  static createWallet(userId: string, overrides: Partial<CreditWallet> = {}): CreditWallet {
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
   * Crée un lot d'utilisateurs
   */
  static createBatch(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export default UserFactory;

