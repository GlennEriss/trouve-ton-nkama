/**
 * Configuration générale pour l'importation des données
 */

export const CONFIG = {
  // Chemins des fichiers
  BIENS_JSON_PATH: './biens_enrichis_with_local_images.json',
  LOCALISATIONS_JSON_PATH: './localisations_enrichies_photon.json',
  IMAGES_FOLDER_PATH: './images/',
  
  // ====================================================================
  // CONFIGURATION FIREBASE STORAGE
  // ====================================================================
  FIREBASE_COLLECTION: 'properties', // Collection Firestore pour les annonces
  
  /**
   * Nom du bucket Firebase Storage (configuré dans .env)
   * 
   * EXEMPLES :
   * - Par défaut: 'location-maison-12345.appspot.com'
   * - Personnalisé: 'properties-images' ou 'immobilier-gabon'
   * 
   * ⚠️ IMPORTANT: Doit correspondre à FIREBASE_STORAGE_BUCKET dans .env
   */
  FIREBASE_STORAGE_BUCKET: 'home-rent-1534e.appspot.com',
  
  // Configuration du traitement
  BATCH_SIZE: 50, // Nombre d'annonces à traiter par lot
  MAX_RETRIES: 3, // Nombre de tentatives en cas d'erreur
  DELAY_BETWEEN_BATCHES: 1000, // Délai entre les lots (ms)
  
  // ====================================================================
  // CONFIGURATION DES RAPPORTS
  // ====================================================================
  /**
   * Dossier où seront sauvegardés les rapports d'importation
   */
  REPORTS_FOLDER: './reports/',
  
  // ====================================================================
  // CONFIGURATION DES ANNONCES IMPORTÉES
  // ====================================================================
  /**
   * UID de l'utilisateur qui sera défini comme propriétaire de toutes les annonces importées
   * Modifiez cette valeur pour changer le propriétaire de toutes les annonces
   */
  DEFAULT_CREATED_BY: 'rgNMpYuXxFMpe3zeYvlxzkigPnm1',
  
  /**
   * État par défaut des annonces importées
   * 'IN_PROGRESS' = actives, 'ARCHIVED' = archivées
   */
  DEFAULT_STATE: 'IN_PROGRESS' as const,
  
  // Validation
  REQUIRED_FIELDS: ['titre', 'description', 'prix', 'type_bien', 'statut'],
  MIN_PRICE: 1, // Prix minimum pour filtrer les annonces
  
  // Logs
  LOG_LEVEL: 'info' as 'debug' | 'info' | 'warn' | 'error',
  LOG_FILE: 'import-log.txt'
} as const;

/**
 * Configuration pour faciliter le changement du propriétaire des annonces
 * 
 * INSTRUCTIONS POUR CHANGER LE PROPRIÉTAIRE :
 * 1. Modifiez CONFIG.DEFAULT_CREATED_BY avec le nouvel UID
 * 2. Lancez le script d'importation
 * 
 * Exemple d'autres UIDs :
 * - Admin principal: 'rgNMpYuXxFMpe3zeYvlxzkigPnm1'
 * - Utilisateur test: 'testUser123456789'
 * - Agent immobilier: 'agentImmo987654321'
 */
export const USER_CONFIG = {
  /**
   * UID actuellement configuré pour les importations
   */
  CURRENT_OWNER: CONFIG.DEFAULT_CREATED_BY,
  
  /**
   * Historique des propriétaires utilisés (pour référence)
   */
  PREVIOUS_OWNERS: [
    // 'ancien_uid_1',
    // 'ancien_uid_2',
  ] as const
} as const;

export const FIRESTORE_COLLECTIONS = {
  PROPERTIES: 'properties',
  USERS: 'users',
  TRANSACTIONS: 'transactions'
} as const;

/**
 * ====================================================================
 * CHEMINS DE STOCKAGE FIREBASE STORAGE
 * ====================================================================
 * 
 * Organisation des fichiers dans le bucket Firebase Storage
 * 
 * Structure générée :
 * 📦 Bucket (ex: location-maison.appspot.com)
 * ├── 📁 properties/images/          ← Images des annonces importées
 * │   ├── 49487_maison_1_timestamp.jpg
 * │   └── 49474_villa_2_timestamp.jpg
 * └── 📁 temp/images/                ← Images temporaires (nettoyage auto)
 *     └── temp_upload_123.jpg
 * 
 * URLs finales :
 * https://storage.googleapis.com/{BUCKET}/{PATH}/{FILENAME}
 * 
 * Exemple complet :
 * https://storage.googleapis.com/location-maison.appspot.com/properties/images/49487_maison_1_1672531200000.jpg
 */
export const FIREBASE_STORAGE_PATHS = {
  /**
   * Dossier principal pour les images des annonces
   * Toutes les images uploadées par le script d'import iront ici
   */
  PROPERTY_IMAGES: 'property',
  
  /**
   * Dossier pour les fichiers temporaires
   * Utilisé pendant les traitements d'images (redimensionnement, etc.)
   */
  TEMP_IMAGES: 'temp/images',
  
  /**
   * Autres dossiers possibles (pour extension future)
   */
  // USER_AVATARS: 'users/avatars',
  // DOCUMENTS: 'properties/documents',
  // THUMBNAILS: 'properties/thumbnails'
} as const;