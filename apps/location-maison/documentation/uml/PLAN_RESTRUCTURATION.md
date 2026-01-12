# Plan de Restructuration - Plateforme Location Maison Gabon

## 📋 Table des matières

1. [Analyse de l'État Actuel](#analyse-de-létat-actuel)
2. [Problèmes Identifiés](#problèmes-identifiés)
3. [Plan de Restructuration](#plan-de-restructuration)
4. [Conventions de Nommage](#conventions-de-nommage)
5. [Architecture des Tests](#architecture-des-tests)
6. [Système de Crédits Repensé](#système-de-crédits-repensé)
7. [GitHub Actions & CI/CD](#github-actions--cicd)
8. [Roadmap de Migration](#roadmap-de-migration)

---

## 📊 Analyse de l'État Actuel

### Ce qui existe

#### ✅ Points positifs
- **GitHub Action** : `test.yml` existe et fonctionne
- **Jenkinsfile** : CI/CD avec Vault pour les secrets
- **Tests existants** : ~30+ fichiers de tests (actions, api, components, db, hooks, services)
- **Mocks existants** : `annonce.mock.ts`, `user.mock.ts`, `next-auth.ts`
- **Jest configuré** : `jest.config.ts` avec coverage activé

#### ❌ Problèmes majeurs

| Domaine | Problème |
|---------|----------|
| **Langue** | Mélange français/anglais (nbrChickens, additionnalInformation, etc.) |
| **Tests** | Pas de tests E2E, pas de rapport de couverture visible |
| **Paiements** | Non fonctionnel, mal structuré |
| **Architecture** | Over-engineering (trop de patterns) |
| **Mocks** | Éparpillés, pas de factory pattern |
| **Types** | Incohérences (`any`, optionnels mal définis) |

---

## 🚨 Problèmes Identifiés

### 1. Incohérences de Langue

**Problème :** Mélange français/anglais dans le code et les modèles.

| Actuel (Incohérent) | Proposition (Anglais) |
|---------------------|----------------------|
| `nbrChickens` | `numberOfKitchens` |
| `additionnalInformation` | `additionalInformation` |
| `nbrRooms` | `numberOfRooms` |
| `nbrBathrooms` | `numberOfBathrooms` |
| `nbrToilets` | `numberOfToilets` |
| `nbrFloors` | `numberOfFloors` |
| `nbrGarages` | `numberOfGarages` |
| `nbrPiscine` | `numberOfPools` |
| `nbrLivingRoom` | `numberOfLivingRooms` |
| `nbrApartments` | `numberOfApartments` |
| `favoris` | `favorites` |

**Convention adoptée : TOUT EN ANGLAIS**

---

### 2. Système de Crédits (Mal Pensé)

**Problèmes actuels :**
- Paiement Airtel Money non fonctionnel
- Modèle `CreditTransaction` trop complexe
- Pas de distinction claire entre types de transactions
- Mélange de concepts (achat, dépense, historique)

**Structure actuelle (confuse) :**
```typescript
interface CreditTransaction {
  type?: 'purchase' | 'spend'  // Optionnel = confusion
  packId?: string              // Pour achats uniquement
  service?: string             // Pour dépenses uniquement
  airtelTransactionId?: string // Spécifique Airtel
  // ... beaucoup de champs optionnels
}
```

**Voir section [Système de Crédits Repensé](#système-de-crédits-repensé) pour la solution.**

---

### 3. Architecture des Tests (Insuffisante)

**État actuel :**
```
__tests__/
├── actions/      # 5 tests
├── api/          # 5 tests
├── components/   # 1 test
├── db/           # 5 tests
├── hooks/        # 4 tests
├── integration/  # 2 tests
├── lib/          # 1 test
├── mocks/        # 4 fichiers (éparpillés)
├── property/     # 5 tests
└── services/     # 4 tests
```

**Problèmes :**
- ❌ Pas de tests E2E (end-to-end)
- ❌ Pas de rapport de couverture automatique
- ❌ Mocks non centralisés, pas de factory
- ❌ Pas de fichier récapitulatif des tests
- ❌ Tests unitaires incomplets

---

### 4. Use Cases Paiements (Flou)

**Problème :** Le use case "Acheter des crédits" n'est pas clair :
- Qui peut acheter ? (Tous les utilisateurs ou uniquement les Annonceurs ?)
- Quel est le flux complet ?
- Quels moyens de paiement ?
- Comment gérer les échecs ?

---

## 🏗️ Plan de Restructuration

### Phase 1 : Conventions et Nommage (1-2 jours)

1. **Standardiser la langue** : Tout en anglais
2. **Corriger les typos** : `nbrChickens` → `numberOfKitchens`
3. **Mettre à jour le diagramme de classes**

### Phase 2 : Restructuration des Tests (1 semaine)

#### Nouvelle structure proposée :

```
__tests__/
├── unit/                           # Tests unitaires
│   ├── models/                     # Validation des modèles
│   ├── services/                   # Services métier
│   ├── repositories/               # Accès données
│   ├── utils/                      # Utilitaires
│   └── components/                 # Composants React
│
├── integration/                    # Tests d'intégration
│   ├── api/                        # Routes API
│   ├── auth/                       # Authentification
│   ├── property/                   # Flux propriétés
│   └── credits/                    # Flux crédits
│
├── e2e/                            # Tests End-to-End
│   ├── scenarios/                  # Scénarios utilisateur
│   │   ├── visitor.e2e.ts          # Parcours visiteur
│   │   ├── searcher.e2e.ts         # Parcours chercheur
│   │   ├── announcer.e2e.ts        # Parcours annonceur
│   │   └── admin.e2e.ts            # Parcours admin
│   └── fixtures/                   # Données de test E2E
│
├── mocks/                          # Mocks centralisés
│   ├── factories/                  # Factory pattern
│   │   ├── user.factory.ts
│   │   ├── property.factory.ts
│   │   ├── transaction.factory.ts
│   │   └── index.ts
│   ├── services/                   # Services mockés
│   │   ├── firebase.mock.ts
│   │   ├── auth.mock.ts
│   │   └── payment.mock.ts
│   └── data/                       # Données de test
│       ├── users.json
│       ├── properties.json
│       └── transactions.json
│
├── coverage/                       # Rapports de couverture
│   └── .gitkeep
│
├── reports/                        # Rapports de tests
│   ├── TEST_COVERAGE.md            # Récapitulatif couverture
│   ├── TEST_MATRIX.md              # Matrice des tests
│   └── CHANGELOG_TESTS.md          # Historique des tests
│
└── setup/                          # Configuration
    ├── jest.setup.ts
    ├── e2e.setup.ts
    └── test-utils.ts
```

### Phase 3 : Simplifier le Système de Crédits (1 semaine)

**Voir section dédiée ci-dessous.**

### Phase 4 : CI/CD Amélioré (2-3 jours)

**Voir section GitHub Actions ci-dessous.**

---

## 📝 Conventions de Nommage

### Code (TypeScript)

| Élément | Convention | Exemple |
|---------|------------|---------|
| Variables | camelCase | `numberOfRooms` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_IMAGES_UPLOAD` |
| Types/Interfaces | PascalCase | `PropertyDetails` |
| Enums | PascalCase | `PropertyType` |
| Valeurs Enum | SCREAMING_SNAKE_CASE | `FOR_RENT` |
| Fichiers TS | kebab-case | `property-service.ts` |
| Composants React | PascalCase | `PropertyCard.tsx` |
| Tests | kebab-case + .test | `property-service.test.ts` |

### Base de données (Firestore)

| Élément | Convention | Exemple |
|---------|------------|---------|
| Collections | snake_case (pluriel) | `properties`, `users` |
| Documents | ID généré ou snake_case | `user_123` |
| Champs | camelCase | `numberOfRooms` |

### Langue

> **RÈGLE : Tout le code en ANGLAIS**

- Commentaires : Anglais
- Variables : Anglais
- Messages d'erreur : Français (pour l'utilisateur final)
- UI/UX : Français (pour l'utilisateur final)

---

## 🧪 Architecture des Tests

### Configuration Jest Améliorée

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Couverture
  collectCoverage: true,
  coverageDirectory: '__tests__/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Organisation des tests
  testMatch: [
    '**/__tests__/unit/**/*.test.[jt]s?(x)',
    '**/__tests__/integration/**/*.test.[jt]s?(x)',
  ],
  
  // Exclusions E2E (géré par Playwright)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/e2e/',
  ],
  
  // Setup
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.ts'],
  
  // Module mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
  },
};

export default config;
```

### Factory Pattern pour les Mocks

```typescript
// __tests__/mocks/factories/user.factory.ts
import { User, Role } from '@/models/authentication';

export class UserFactory {
  private static counter = 0;
  
  static create(overrides: Partial<User> = {}): User {
    this.counter++;
    return {
      id: `user-${this.counter}`,
      uid: `uid-${this.counter}`,
      login: `user${this.counter}@test.com`,
      firstname: 'Test',
      lastname: 'User',
      email: `user${this.counter}@test.com`,
      roles: [],
      providers: ['CREDENTIALS'],
      phoneNumbers: ['+24177000000'],
      phoneNumberVerified: false,
      emailVerified: true,
      favorites: [],
      credits: 3,
      state: 'IN_PROGRESS',
      ...overrides
    };
  }
  
  static createSearcher(overrides: Partial<User> = {}): User {
    return this.create({
      roles: [],
      ...overrides
    });
  }
  
  static createAnnouncer(overrides: Partial<User> = {}): User {
    return this.create({
      roles: ['Announcer'],
      credits: 10,
      ...overrides
    });
  }
  
  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      roles: ['Admin', 'Announcer'],
      credits: 999,
      ...overrides
    });
  }
  
  static reset(): void {
    this.counter = 0;
  }
}
```

### Rapport de Couverture

```markdown
<!-- __tests__/reports/TEST_COVERAGE.md -->
# Rapport de Couverture des Tests

## Résumé Global

| Métrique | Couverture | Objectif | Statut |
|----------|------------|----------|--------|
| Statements | XX% | 70% | ✅/❌ |
| Branches | XX% | 70% | ✅/❌ |
| Functions | XX% | 70% | ✅/❌ |
| Lines | XX% | 70% | ✅/❌ |

## Par Module

### Authentication
- [ ] login.ts - XX%
- [ ] signup.ts - XX%
- [ ] signout.ts - XX%

### Properties
- [ ] property.service.ts - XX%
- [ ] property.repository.ts - XX%

### Credits
- [ ] credits.service.ts - XX%
- [ ] payment.service.ts - XX%

## Tests Manquants

1. ❌ E2E : Parcours complet chercheur
2. ❌ E2E : Parcours complet annonceur
3. ❌ Integration : Flux paiement
```

---

## 💳 Système de Crédits Repensé

### Problème Actuel

Le système actuel mélange plusieurs concepts :
- Achat de crédits (paiement Airtel)
- Dépense de crédits (promotion, IA)
- Historique des transactions
- États de transaction

### Solution : Séparation Claire

#### Nouveaux Modèles

```typescript
// === MODÈLE SIMPLIFIÉ ===

// Portefeuille utilisateur
interface CreditWallet {
  userId: string;
  balance: number;           // Solde actuel
  totalPurchased: number;    // Total acheté
  totalSpent: number;        // Total dépensé
  lastUpdated: Timestamp;
}

// Pack de crédits disponible
interface CreditPack {
  id: string;
  name: string;              // "Pack Starter", "Pack Pro", etc.
  credits: number;           // Nombre de crédits
  priceXAF: number;          // Prix en FCFA
  discount?: number;         // Réduction en %
  isActive: boolean;
}

// Transaction d'ACHAT
interface CreditPurchase {
  id: string;
  userId: string;
  packId: string;
  credits: number;
  amountXAF: number;
  status: PurchaseStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string; // Référence Airtel/autre
  createdAt: Timestamp;
  completedAt?: Timestamp;
  failureReason?: string;
}

// Transaction de DÉPENSE
interface CreditExpense {
  id: string;
  userId: string;
  credits: number;           // Nombre de crédits dépensés
  service: ExpenseService;   // Service utilisé
  referenceId?: string;      // ID propriété/promotion
  description: string;
  createdAt: Timestamp;
}

// Énumérations
type PurchaseStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
type PaymentMethod = 'airtel_money' | 'free_credits' | 'admin_grant';
type ExpenseService = 'property_publish' | 'promotion_featured' | 'promotion_trending' | 'promotion_boost' | 'ai_generation';
```

### Use Case Achat de Crédits (Corrigé)

```
┌─────────────────────────────────────────────────────────┐
│         UC: Acheter des Crédits (Annonceur)             │
├─────────────────────────────────────────────────────────┤
│ Acteur: Annonceur                                        │
│ Précondition: Utilisateur authentifié avec rôle Announcer│
├─────────────────────────────────────────────────────────┤
│ Scénario principal:                                      │
│ 1. L'annonceur accède à "Mon solde"                      │
│ 2. Le système affiche le solde actuel                    │
│ 3. L'annonceur clique sur "Acheter des crédits"          │
│ 4. Le système affiche les packs disponibles              │
│ 5. L'annonceur sélectionne un pack                       │
│ 6. Le système affiche les options de paiement            │
│ 7. L'annonceur choisit Airtel Money                      │
│ 8. L'annonceur entre son numéro de téléphone             │
│ 9. Le système initie la transaction                      │
│ 10. L'annonceur confirme sur son téléphone               │
│ 11. Le système reçoit la confirmation                    │
│ 12. Le système crédite le portefeuille                   │
│ 13. Le système affiche la confirmation                   │
├─────────────────────────────────────────────────────────┤
│ Extensions:                                              │
│ 7a. L'annonceur n'a pas Airtel Money → Afficher autres   │
│ 10a. Timeout → Transaction annulée                       │
│ 11a. Paiement refusé → Afficher erreur                   │
├─────────────────────────────────────────────────────────┤
│ Postcondition: Crédits ajoutés au portefeuille           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 GitHub Actions & CI/CD

### Workflow Amélioré

```yaml
# .github/workflows/test.yml
name: Tests & Quality

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # =====================================
  # TESTS UNITAIRES
  # =====================================
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./__tests__/coverage/lcov.info
          flags: unit
          name: unit-coverage

  # =====================================
  # TESTS D'INTÉGRATION
  # =====================================
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          # Variables d'environnement de test
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID_TEST }}

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./__tests__/coverage/lcov.info
          flags: integration
          name: integration-coverage

  # =====================================
  # TESTS E2E
  # =====================================
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build
        env:
          # Variables de build
          NEXT_PUBLIC_API_URL: http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload E2E report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  # =====================================
  # RAPPORT DE COUVERTURE
  # =====================================
  coverage-report:
    name: Coverage Report
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download unit coverage
        uses: actions/download-artifact@v4
        with:
          name: unit-coverage

      - name: Check coverage threshold
        run: |
          # Vérifier que la couverture est >= 70%
          COVERAGE=$(cat coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "❌ Coverage is below 70%: $COVERAGE%"
            exit 1
          fi
          echo "✅ Coverage is $COVERAGE%"

  # =====================================
  # LINT & TYPE CHECK
  # =====================================
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: ESLint
        run: npm run lint
```

### Scripts package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern='__tests__/unit'",
    "test:integration": "jest --testPathPattern='__tests__/integration'",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit"
  }
}
```

---

## 📅 Roadmap de Migration

### Sprint 1 : Fondations (Semaine 1-2)

| Tâche | Priorité | Durée |
|-------|----------|-------|
| Standardiser les noms (anglais) | 🔴 Haute | 2j |
| Corriger `nbrChickens` → `numberOfKitchens` | 🔴 Haute | 1j |
| Créer structure `__tests__/` améliorée | 🔴 Haute | 1j |
| Créer factories de mocks | 🟡 Moyenne | 2j |
| Mettre à jour GitHub Action | 🔴 Haute | 1j |
| Créer `TEST_COVERAGE.md` | 🟡 Moyenne | 1j |

### Sprint 2 : Tests (Semaine 3-4)

| Tâche | Priorité | Durée |
|-------|----------|-------|
| Écrire tests unitaires manquants | 🔴 Haute | 3j |
| Écrire tests d'intégration | 🔴 Haute | 2j |
| Configurer Playwright pour E2E | 🟡 Moyenne | 1j |
| Écrire E2E parcours visiteur | 🟡 Moyenne | 1j |
| Écrire E2E parcours annonceur | 🟡 Moyenne | 1j |
| Atteindre 70% de couverture | 🔴 Haute | 2j |

### Sprint 3 : Système de Crédits (Semaine 5-6)

| Tâche | Priorité | Durée |
|-------|----------|-------|
| Refactoriser modèles crédits | 🔴 Haute | 2j |
| Implémenter `CreditWallet` | 🔴 Haute | 1j |
| Séparer `CreditPurchase` / `CreditExpense` | 🔴 Haute | 2j |
| Créer service de paiement abstrait | 🟡 Moyenne | 2j |
| Tests unitaires crédits | 🔴 Haute | 1j |
| Tests intégration crédits | 🟡 Moyenne | 1j |

### Sprint 4 : Finalisation (Semaine 7-8)

| Tâche | Priorité | Durée |
|-------|----------|-------|
| Mettre à jour tous les diagrammes UML | 🟡 Moyenne | 2j |
| Documentation API | 🟢 Basse | 2j |
| E2E parcours complet | 🟡 Moyenne | 2j |
| Revue code et refactoring | 🔴 Haute | 2j |
| Tests de performance | 🟢 Basse | 1j |

---

## ✅ Checklist de Validation

### Avant chaque PR sur `develop`

- [ ] Tests unitaires passent (≥70% couverture)
- [ ] Tests d'intégration passent
- [ ] TypeScript sans erreurs
- [ ] ESLint sans erreurs
- [ ] Pas de `console.log` en production
- [ ] Conventions de nommage respectées (anglais)

### Avant merge sur `main`

- [ ] Tous les tests passent
- [ ] Tests E2E passent
- [ ] Revue de code effectuée
- [ ] Documentation à jour
- [ ] CHANGELOG mis à jour

---

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase Testing](https://firebase.google.com/docs/rules/unit-tests)

---

*Document créé le : 2026-01-12*  
*Version : 1.0*

