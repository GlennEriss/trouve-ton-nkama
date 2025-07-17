# Tests d'intégration de la couche Base de Données

Ce dossier contient les tests d'intégration pour toutes les fonctions de la couche base de données (`src/db/`).

## 📁 Structure des tests

```
__tests__/db/
├── credit-transaction.db.test.ts    # Tests des transactions de crédits
├── property.db.test.ts              # Tests CRUD des propriétés  
├── user.db.test.ts                  # Tests de gestion des utilisateurs
├── notification.db.test.ts          # Tests de création de notifications
├── file.db.test.ts                  # Tests d'upload/gestion de fichiers
└── README.md                        # Cette documentation
```

## 🧪 Types de tests

### **credit-transaction.db.test.ts** 
*Le plus critique - Gestion financière*

**Fonctions testées :**
- `createCreditTransaction()` - Création transactions achat/dépense
- `getCreditTransactionById()` - Récupération par ID avec mapping anciens formats
- `updateTransactionStatus()` - MAJ statuts (success/failed/pending)  
- `getCreditHistoryByUserId()` - Historique avec pagination et filtres
- `getCreditTransactionCount()` - Comptage par utilisateur/type
- `getCreditTransactionStats()` - Statistiques globales
- `createSpendTransaction()` - Transactions de dépense spécialisées
- `deductCreditsWithTransaction()` - Déduction avec transaction atomique

**Scénarios testés :**
- Flux complet achat → confirmation → dépense
- Pagination de l'historique
- Mapping données legacy (airtelTransactionId → transactionId)
- Gestion d'erreurs robuste
- Montants élevés et cas limites

### **property.db.test.ts**
*CRUD des biens immobiliers*

**Fonctions testées :**
- `createProperty()` - Création propriétés (Home, Apartment, Villa...)
- `getPropertyById()` - Récupération par ID
- `updateProperty()` - Mise à jour partielle/complète
- `deleteProperty()` - Suppression logique
- `getProperties()` - Listing avec filtres (créateur, type, pagination)
- `getCountStatisticsByPropertyType()` - Stats par utilisateur/type
- `getServerCountByProvince()` - Stats géographiques
- `getServerCountByPropertyType()` - Stats globales par type

**Scénarios testés :**
- Cycle CRUD complet d'une propriété
- Filtrage multi-critères
- Pagination des résultats
- Gestion des erreurs

### **user.db.test.ts**
*Gestion des utilisateurs*

**Fonctions testées :**
- `createUser()` - Création utilisateur
- `getUserByUID()` - Récupération par UID Firebase
- `findUserDetailsByUserID()` - Détails utilisateur
- `findUserByEmail()` - Recherche par email
- `updateUser()` - MAJ profil (exclut createdAt automatiquement)

**Scénarios testés :**
- Flux complet : création → récupération → mise à jour
- Recherche par différents critères
- Exclusion automatique de createdAt lors des MAJ
- Gestion d'erreurs et utilisateurs inexistants

### **notification.db.test.ts**
*Système de notifications*

**Fonctions testées :**
- `createNotification()` - Création avec métadonnées automatiques

**Scénarios testés :**
- Notifications de propriétés (soumise, approuvée, rejetée)
- Notifications de paiement (pending, success, failed)
- Métadonnées automatiques (state: 'IN_PROGRESS', timestamps)
- Données personnalisées préservées
- Types multiples de notifications

### **file.db.test.ts**
*Gestion des fichiers*

**Fonctions testées :**
- `timestampedFileName()` - Génération noms uniques
- `createFile()` - Upload avec métadonnées (owner, status)
- `updateFile()` - Archivage (status: 'Archived')

**Scénarios testées :**
- Cycle complet : upload → archivage
- Types de fichiers multiples (images, PDF, vidéos...)
- Métadonnées personnalisées
- Gros fichiers et caractères spéciaux
- Upload parallèle de multiples fichiers

## 🔧 Configuration des tests

### **Mocking Strategy**
Tous les tests utilisent des **mocks Jest** au lieu d'émulateurs Firebase pour :
- ⚡ Vitesse d'exécution
- 🔄 Isolation complète 
- 🛠 Contrôle précis des scénarios d'erreur
- 📝 Vérification des appels avec arguments exacts

### **Structure des mocks**
```typescript
jest.mock('@/firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(), 
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  // ...
}));
```

## 🚀 Exécution des tests

```bash
# Tous les tests DB
npm test __tests__/db/

# Test spécifique  
npm test __tests__/db/credit-transaction.db.test.ts

# Mode watch
npm test __tests__/db/ --watch

# Avec couverture
npm test __tests__/db/ --coverage
```

## 🎯 Priorités de tests

### 🔴 **CRITIQUE** 
1. **credit-transaction.db.test.ts** - Système de paiement
2. **user.db.test.ts** - Authentification/profils

### 🟡 **IMPORTANT**
3. **property.db.test.ts** - Cœur métier immobilier  
4. **file.db.test.ts** - Upload photos/documents

### 🟢 **NORMAL** 
5. **notification.db.test.ts** - Expérience utilisateur

## 📊 Couverture attendue

- **Fonctions :** 100% 
- **Branches :** 90%+ (gestion d'erreurs complète)
- **Lignes :** 95%+

## 🔗 Relations avec autres tests

Ces tests DB s'intègrent avec :
- `__tests__/api/` - Tests d'endpoints utilisant ces fonctions
- `__tests__/services/` - Tests de logique métier
- `__tests__/hooks/` - Tests de hooks React utilisant ces données

## 🚨 Points d'attention

1. **Transactions financières** : Vérification minutieuse des montants et statuts
2. **Mapping legacy** : Support des anciens formats de données  
3. **Pagination** : Tests des cas limites (firstPage, lastPage, empty)
4. **Erreurs** : Chaque fonction doit gracieusement gérer les échecs
5. **Types** : Utilisation de `any` uniquement quand nécessaire pour les mocks 