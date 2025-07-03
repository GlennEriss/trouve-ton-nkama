# Tests d'API - Location Maison

Ce répertoire contient les tests pour toutes les routes API de l'application Location Maison. Ces tests vérifient le bon fonctionnement des endpoints Next.js App Router, l'authentification Firebase, les interactions avec la base de données Firestore, et la gestion des erreurs.

## 📁 Structure des Tests

```
__tests__/api/
├── auth.api.test.ts           # Tests d'authentification (17 tests)
├── credits.api.test.ts        # Tests de gestion des crédits (25 tests)  
├── property.api.test.ts       # Tests CRUD propriétés (42 tests)
├── notifications.api.test.ts  # Tests API notifications (35 tests)
├── search.api.test.ts         # Tests de recherche/géolocalisation (48 tests)
└── README.md                  # Documentation (ce fichier)
```

**Total estimé : 167 tests**

## 🔧 Technologies Testées

- **Next.js 13+ App Router** - Routes API avec handlers GET/POST/PATCH
- **Firebase Admin SDK** - Authentification et Firestore
- **Redis** - Cache et optimisation des performances
- **Nominatim API** - Géocodage et recherche d'adresses
- **TypeScript** - Types et validation stricte

## 📋 APIs Testées

### 1. Authentification (`auth.api.test.ts`)

**Route testée :** `POST /api/generate-token`

**Fonctionnalités :**
- Génération de tokens Firebase customisés
- Validation des UIDs utilisateur
- Gestion des erreurs Firebase Admin
- Sécurité contre les injections et XSS
- Support des requêtes concurrentes

**Cas d'usage métier :**
- Connexion automatique après inscription
- Renouvellement de session utilisateur
- Intégration avec NextAuth.js

### 2. Gestion des Crédits (`credits.api.test.ts`)

**Route testée :** `GET /api/credits/balance`

**Fonctionnalités :**
- Récupération du solde utilisateur avec authentification
- Initialisation automatique (3 crédits de bienvenue)
- Gestion utilisateurs non trouvés
- Validation tokens Firebase expirés/invalides
- Protection des données sensibles selon l'environnement

**Cas d'usage métier :**
- Affichage du solde dans l'interface
- Décompte automatique lors d'actions payantes
- Système de freemium avec crédits gratuits

### 3. Propriétés Immobilières (`property.api.test.ts`)

**Route testée :** `GET /api/property/list`

**Fonctionnalités :**
- Listing paginé des propriétés
- Cache Redis avec TTL configurable
- Pagination avec curseur Firestore
- Gestion des erreurs Redis et Firestore
- Headers de cache HTTP optimisés

**Cas d'usage métier :**
- Page d'accueil avec propriétés en vedette
- Recherche et filtrage immobilier
- Performance optimisée pour le mobile

### 4. Notifications (`notifications.api.test.ts`)

**API simulée complète :** GET/POST/PATCH `/api/notifications`

**Fonctionnalités :**
- Récupération notifications (lues/non lues)
- Création de notifications métier
- Marquage comme lu individuel
- Types : SECURITY, BOOKMARKING
- Validation et échappement de contenu

**Cas d'usage métier :**
- Notifications temps réel (favoris, paiements)
- Alertes de sécurité et modération
- Engagement utilisateur

### 5. Recherche et Géolocalisation (`search.api.test.ts`)

**Routes testées :**
- `GET /api/geocode` (reverse geocoding)
- `GET /api/geocode/search` (forward geocoding)

**Fonctionnalités :**
- Géocodage inverse (coordonnées → adresse)
- Recherche d'adresses (texte → coordonnées)
- Filtrage par pays Gabon
- Validation des coordonnées GPS
- Gestion des erreurs réseau Nominatim

**Cas d'usage métier :**
- Localisation automatique des propriétés
- Recherche par adresse dans l'interface
- Cartographie interactive

## 🚀 Exécution des Tests

### Tests individuels
```bash
# Tests d'authentification
npm test auth.api.test.ts

# Tests de crédits  
npm test credits.api.test.ts

# Tests de propriétés
npm test property.api.test.ts

# Tests de notifications
npm test notifications.api.test.ts

# Tests de recherche
npm test search.api.test.ts
```

### Tous les tests API
```bash
npm test __tests__/api/
```

### Avec couverture
```bash
npm test __tests__/api/ -- --coverage
```

## 📊 Métriques de Couverture Attendues

| Fichier | Statements | Branches | Functions | Lines |
|---------|------------|----------|-----------|-------|
| auth routes | 95% | 90% | 100% | 95% |
| credits routes | 98% | 95% | 100% | 98% |
| property routes | 92% | 88% | 100% | 92% |
| geocoding routes | 94% | 91% | 100% | 94% |

**Couverture globale attendue :** ~94%

## 🔍 Types de Tests Implémentés

### Tests Fonctionnels
- ✅ Validation des paramètres d'entrée
- ✅ Réponses JSON correctes
- ✅ Codes de statut HTTP appropriés
- ✅ Logique métier conforme aux spécifications

### Tests de Sécurité
- ✅ Authentification Firebase requise
- ✅ Validation des tokens JWT
- ✅ Protection contre l'injection de code
- ✅ Échappement des caractères dangereux
- ✅ Limitation des payloads volumineux

### Tests de Performance
- ✅ Gestion des requêtes concurrentes
- ✅ Timeouts et gestion d'erreurs réseau
- ✅ Cache Redis et optimisations
- ✅ Pagination efficace

### Tests d'Intégration
- ✅ Interaction Firestore authentifiée
- ✅ Appels API externes (Nominatim)
- ✅ Pipeline complet requête → réponse
- ✅ Gestion cohérente des erreurs

## 🛠 Configuration des Mocks

### Firebase Admin
```typescript
const mockAdminAuth = {
  verifyIdToken: jest.fn(),
  createCustomToken: jest.fn()
};
```

### Firestore
```typescript
const mockFirestore = {
  collection: jest.fn(() => ({
    where: jest.fn(() => ({
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn()
        }))
      }))
    }))
  }))
};
```

### Redis
```typescript
const mockRedis = {
  get: jest.fn(),
  set: jest.fn()
};
```

### Fetch (APIs externes)
```typescript
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;
```

## 🐛 Debugging et Logs

### Variables d'environnement pour tests
```bash
NODE_ENV=test
REDIS_CATALOG_TTL=600
```

### Logs d'erreur capturés
- Erreurs Firebase authentification
- Timeouts Firestore et Redis  
- Erreurs API Nominatim
- Exceptions de parsing JSON

### Console spy pour validation
```typescript
const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
// ... tests ...
consoleSpy.mockRestore();
```

## 📈 Cas d'Usage Métier Couverts

### Parcours Utilisateur Complet
1. **Inscription** → Génération token + 3 crédits gratuits
2. **Navigation** → Listing propriétés avec cache optimisé
3. **Recherche** → Géolocalisation et filtrage par adresse
4. **Actions** → Décompte crédits + notifications temps réel
5. **Engagement** → Favoris, partage, alertes

### Scénarios d'Erreur
- Connexion instable (timeouts réseau)
- Tokens expirés (renouvellement session)
- Quota API dépassé (graceful degradation)
- Cache Redis indisponible (fallback Firestore)

### Performance
- **Pagination** : Curseur Firestore pour grandes collections
- **Cache** : Redis TTL configurable par environnement
- **Concurrence** : Tests de charge avec 5-10 requêtes simultanées
- **Réseau** : Gestion timeouts et retry automatique

## 🚨 Limitations et Améliorations

### Non Testé (Webhooks exclus)
- `POST /api/webhooks/airtel` - Webhooks Airtel Money (marqué comme non utilisé)

### Améliorations Futures
- Tests end-to-end avec base de données réelle
- Tests de charge avec plus de 100 utilisateurs simultanés
- Validation des schemas JSON avec Joi/Zod
- Monitoring APM et alertes temps réel

## 📞 Support

Pour toute question sur les tests d'API :
1. Vérifier les logs Jest pour les erreurs détaillées
2. Consulter la documentation Firebase Admin SDK
3. Valider les variables d'environnement de test
4. Examiner les mocks pour les comportements attendus

---

**Dernière mise à jour :** Décembre 2024  
**Compatibilité :** Next.js 14+, Node.js 18+, Jest 29+
