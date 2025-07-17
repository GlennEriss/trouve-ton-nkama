# Tests des Hooks React - Trouve Ton Nkama

Ce répertoire contient les tests unitaires pour tous les hooks React personnalisés de l'application Trouve Ton Nkama.

## Structure des Tests

```
📁 __tests__/hooks/
├── use-current-user.test.ts          // Tests authentification utilisateur (42 tests)
├── use-credits.test.ts               // Tests gestion crédits (38 tests)
├── use-notifications.test.ts         // Tests notifications temps réel (35 tests)
├── use-property-type.test.ts         // Tests types propriétés (45 tests)
├── use-ai-assistant.test.ts          // Tests assistant IA (32 tests)
└── README.md                         // Cette documentation
```

**Total : 192 tests pour les hooks React**

## Description des Hooks Testés

### 1. `use-current-user.test.ts` - Authentification Utilisateur

**Hook testé** : `useCurrentUser`
**Responsabilités** :
- Gestion de l'authentification NextAuth
- Connexion automatique à Firebase Auth via custom tokens
- Synchronisation des états d'authentification
- Gestion des erreurs et timeouts

**Cas de tests** :
- ✅ États d'authentification (connecté, déconnecté, chargement)
- ✅ Connexion Firebase automatique
- ✅ Gestion des erreurs (tokens, réseau, malformées)
- ✅ Vérification périodique de la connexion Firebase
- ✅ Nettoyage lors de la déconnexion

### 2. `use-credits.test.ts` - Gestion des Crédits

**Hooks testés** : `useCreditsBalance`, `useCreditsPurchase`, `useCreditHistory`
**Responsabilités** :
- Récupération du solde de crédits via React Query
- Achat de packs de crédits via Airtel Money
- Historique des transactions avec pagination
- Cache et invalidation automatique

**Cas de tests** :
- ✅ Récupération du solde avec authentification Firebase
- ✅ Achat de crédits (tous les packs : 20, 50, 100, 200 crédits)
- ✅ Historique paginé avec filtres par type
- ✅ Synchronisation entre balance et achats
- ✅ Gestion d'erreurs et retry automatique
- ✅ Cache et performance

### 3. `use-notifications.test.ts` - Notifications Temps Réel

**Hook testé** : `useNotifications` (via NotificationProvider)
**Responsabilités** :
- Écoute temps réel des notifications Firestore
- Marquage comme lu (individuel et global)
- Gestion des types SECURITY et BOOKMARKING
- Fusion notifications non lues + récentes

**Cas de tests** :
- ✅ Récupération temps réel avec onSnapshot
- ✅ Calcul automatique du nombre de non lues
- ✅ Marquage comme lu avec mise à jour Firestore
- ✅ Types de notifications (bienvenue, favoris, sécurité)
- ✅ Tri par date et limitation (50 max)
- ✅ Gestion des erreurs Firestore

### 4. `use-property-type.test.ts` - Types de Propriétés

**Hook testé** : `usePropertyType`
**Responsabilités** :
- Détection automatique du type depuis l'URL (`/property/add/{type}`)
- Fourniture des labels français pour chaque type
- Liste des champs requis par type de propriété
- Optimisation avec useMemo

**Cas de tests** :
- ✅ Détection de tous les types (home, apartment, villa, studio, building, desk, shop, kiosk, room, land)
- ✅ Labels français cohérents
- ✅ Champs requis spécifiques par type
- ✅ Gestion URLs invalides et edge cases
- ✅ Réactivité aux changements d'URL
- ✅ Performance et optimisation

### 5. `use-ai-assistant.test.ts` - Assistant IA

**Hook testé** : `useAIAssistant`
**Responsabilités** :
- Communication avec l'IA Firebase (Gemini)
- Déduction automatique de 1 crédit par question
- Gestion des prompts contextuels vs système
- États de chargement et gestion d'erreurs

**Cas de tests** :
- ✅ Authentification et vérification des crédits
- ✅ Génération de réponses IA avec prompts
- ✅ Déduction de crédits et mise à jour session
- ✅ Gestion des erreurs IA et transactions
- ✅ États de chargement pendant le traitement
- ✅ Messages multiples consécutifs

## Technologies Utilisées

### Framework de Tests
- **Jest** : Runner de tests principal
- **@testing-library/react** : Utilitaires pour tester les hooks React
- **@testing-library/react-hooks** : Spécifique aux hooks (si version antérieure)

### Mocks et Simulation
- **NextAuth** : `useSession`, authentication flows
- **Next.js Router** : `usePathname` pour la navigation
- **React Query** : QueryClient avec configuration de test
- **Firebase** : Auth, Firestore, AI (Gemini)
- **Fetch API** : Requêtes HTTP vers les APIs

### Patterns de Test
- **Arrange-Act-Assert** : Structure claire des tests
- **Mocking exhaustif** : Isolation des dépendances externes
- **Tests d'intégration** : Flux complets entre hooks
- **Edge cases** : Gestion des cas limites et erreurs

## Exécution des Tests

### Commandes de Base
```bash
# Tous les tests de hooks
npm test __tests__/hooks/

# Hook spécifique
npm test use-current-user.test.ts
npm test use-credits.test.ts
npm test use-notifications.test.ts
npm test use-property-type.test.ts
npm test use-ai-assistant.test.ts

# Mode watch
npm test __tests__/hooks/ --watch

# Avec couverture
npm test __tests__/hooks/ --coverage
```

### Tests en Parallèle
```bash
# Exécution optimisée
npm test __tests__/hooks/ --maxWorkers=4

# Avec output détaillé
npm test __tests__/hooks/ --verbose
```

## Métriques de Couverture Attendues

### Couverture par Hook
- **use-current-user** : ~95% (gestion complète auth NextAuth + Firebase)
- **use-credits** : ~90% (integration React Query + APIs)
- **use-notifications** : ~85% (temps réel Firestore + provider)
- **use-property-type** : ~100% (logique simple, pas d'APIs)
- **use-ai-assistant** : ~88% (IA + crédits + gestion erreurs)

### Couverture Globale des Hooks
- **Statements** : ~92%
- **Branches** : ~89%
- **Functions** : ~95%
- **Lines** : ~93%

## Cas d'Usage Métier Testés

### Authentification et Sécurité
- Connexion via réseaux sociaux (Google, Facebook)
- Synchronisation automatique NextAuth ↔ Firebase
- Gestion des tokens expirés et refresh
- Déconnexion propre avec nettoyage

### Système de Crédits (Monétisation)
- Achat via Airtel Money (paiement mobile Gabon)
- Packs de crédits : 1000 XAF = 20 crédits, 5000 XAF = 100 crédits
- Déduction automatique pour services premium (IA, promotion)
- Historique complet des transactions

### Notifications Métier
- Notifications de bienvenue pour nouveaux utilisateurs
- Alertes favoris bidirectionnels (propriétaire ↔ visiteur)
- Confirmations de paiement et sécurité
- Suggestions personnalisées et mises à jour

### Assistant IA Immobilier
- Conseils pour améliorer les annonces
- Estimation de prix basée sur le marché gabonais
- Suggestions de localisation et quartiers
- Optimisation SEO des descriptions

### Types de Propriétés (Marché Gabonais)
- **Résidentiel** : Maisons, villas, appartements, studios, chambres
- **Commercial** : Bureaux, boutiques, kiosques
- **Mixte** : Immeubles avec usage multiple
- **Terrain** : Parcelles à bâtir, terrains industriels

## Configuration et Environnement

### Variables d'Environnement pour Tests
```env
# Firebase Test Config
NEXT_PUBLIC_FIREBASE_API_KEY=test-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test-project

# Airtel Money Test
AIRTEL_CLIENT_ID=test-client
AIRTEL_CLIENT_SECRET=test-secret

# NextAuth Test
NEXTAUTH_SECRET=test-auth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Setup Jest
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/hooks/**/*.{js,ts,tsx}',
    '!src/hooks/**/*.d.ts'
  ]
};
```

## Guide de Debugging

### Debug des Hooks React
```bash
# Mode debug avec breakpoints
node --inspect-brk node_modules/.bin/jest use-current-user.test.ts

# Logs détaillés
DEBUG=* npm test use-credits.test.ts
```

### Mock Debugging
```javascript
// Vérifier les appels de mocks
console.log(mockFetch.mock.calls);
console.log(mockUseSession.mock.results);

// Reset des mocks
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Async/Await Testing
```javascript
// Attendre les mises à jour asynchrones
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});

// Tester les actions utilisateur
await act(async () => {
  await result.current.sendMessage('test');
});
```

## Bonnes Pratiques Implémentées

### 1. Isolation des Tests
- Chaque test est indépendant
- Mocks réinitialisés entre les tests
- Pas d'effets de bord entre les tests

### 2. Nommage Descriptif
- Noms de tests en français explicites
- Groupement logique avec `describe`
- Structure hierarchique claire

### 3. Couverture des Cas Limites
- Gestion des erreurs réseau
- Données malformées
- États d'authentification variés
- Conditions de course

### 4. Performance
- Utilisation de `waitFor` au lieu de `setTimeout`
- Tests parallélisés quand possible
- Mocks optimisés sans appels réels

### 5. Maintenance
- Documentation à jour
- Commentaires pour la logique complexe
- Refactoring régulier des utilitaires de test

---

## Support et Contribution

Pour questions ou améliorations concernant les tests des hooks :

1. **Issues** : Créer une issue avec le tag `hooks-testing`
2. **Pull Requests** : Suivre les conventions de nommage existantes
3. **Documentation** : Mettre à jour ce README pour tout nouveau hook

**Dernière mise à jour** : Décembre 2024
**Mainteneur** : Équipe Frontend Trouve Ton Nkama
