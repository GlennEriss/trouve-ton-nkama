# Matrice des Tests - Plateforme Location Maison Gabon

## 📊 Vue d'ensemble

| Type de Test | Statut | Couverture | Fichiers |
|--------------|--------|------------|----------|
| Tests Unitaires | 🟡 Partiel | ~30% | 25+ |
| Tests d'Intégration | 🟡 Partiel | ~10% | 2 |
| Tests E2E | 🔴 Absent | 0% | 0 |

---

## 🧪 Tests Unitaires

### Authentication (`__tests__/actions/`)

| Fichier | Fonctionnalité | Statut | Couverture |
|---------|----------------|--------|------------|
| `login.test.ts` | Connexion email/password | ✅ Présent | 🟡 Partiel |
| `signup.test.ts` | Inscription | ✅ Présent | 🟡 Partiel |
| `signout.test.ts` | Déconnexion | ✅ Présent | 🟡 Partiel |
| `signin-with-google.test.ts` | Connexion Google | ✅ Présent | 🟡 Partiel |
| `signin-with-facebook.test.ts` | Connexion Facebook | ✅ Présent | 🟡 Partiel |
| `verify-email.test.ts` | Vérification email | ❌ Absent | - |
| `reset-password.test.ts` | Réinitialisation mdp | ❌ Absent | - |

### API Routes (`__tests__/api/`)

| Fichier | Fonctionnalité | Statut | Couverture |
|---------|----------------|--------|------------|
| `auth.api.test.ts` | Endpoints auth | ✅ Présent | 🟡 Partiel |
| `credits.api.test.ts` | Endpoints crédits | ✅ Présent | 🟢 Bon |
| `notifications.api.test.ts` | Endpoints notifications | ✅ Présent | 🟡 Partiel |
| `property.api.test.ts` | Endpoints propriétés | ✅ Présent | 🟡 Partiel |
| `search.api.test.ts` | Endpoints recherche | ✅ Présent | 🟡 Partiel |
| `payment.api.test.ts` | Endpoints paiement | ❌ Absent | - |

### Database Layer (`__tests__/db/`)

| Fichier | Fonctionnalité | Statut | Couverture |
|---------|----------------|--------|------------|
| `user.db.test.ts` | CRUD utilisateurs | ✅ Présent | 🟡 Partiel |
| `property.db.test.ts` | CRUD propriétés | ✅ Présent | 🟡 Partiel |
| `notification.db.test.ts` | CRUD notifications | ✅ Présent | 🟡 Partiel |
| `credit-transaction.db.test.ts` | CRUD transactions | ✅ Présent | 🟡 Partiel |
| `file.db.test.ts` | Upload fichiers | ✅ Présent | 🟡 Partiel |
| `promotion.db.test.ts` | CRUD promotions | ❌ Absent | - |

### Hooks (`__tests__/hooks/`)

| Fichier | Fonctionnalité | Statut | Couverture |
|---------|----------------|--------|------------|
| `use-current-user.test.ts` | Hook utilisateur | ✅ Présent | 🟡 Partiel |
| `use-notifications.test.ts` | Hook notifications | ✅ Présent | 🟡 Partiel |
| `use-property-type.test.ts` | Hook type propriété | ✅ Présent | 🟡 Partiel |
| `use-ai-assistant.test.ts` | Hook assistant IA | ✅ Présent | 🟡 Partiel |
| `use-credits.test.ts` | Hook crédits | ❌ Absent | - |
| `use-favorites.test.ts` | Hook favoris | ❌ Absent | - |

### Services (`__tests__/services/`)

| Fichier | Fonctionnalité | Statut | Couverture |
|---------|----------------|--------|------------|
| `ai-prompts.service.test.ts` | Prompts IA | ✅ Présent | 🟡 Partiel |
| `geocoding.service.test.ts` | Géocodage | ✅ Présent | 🟡 Partiel |
| `notification.service.test.ts` | Notifications | ✅ Présent | 🟡 Partiel |
| `search.service.test.ts` | Recherche | ✅ Présent | 🟡 Partiel |
| `payment.service.test.ts` | Paiement Airtel | ❌ Absent | - |
| `credit.service.test.ts` | Gestion crédits | ❌ Absent | - |

### Components (`__tests__/components/`)

| Fichier | Fonctionnalité | Statut | Couverture |
|---------|----------------|--------|------------|
| `PhoneInput.test.tsx` | Input téléphone | ✅ Présent | 🟡 Partiel |
| `PropertyCard.test.tsx` | Carte propriété | ❌ Absent | - |
| `LoginForm.test.tsx` | Formulaire connexion | ❌ Absent | - |
| `RegisterForm.test.tsx` | Formulaire inscription | ❌ Absent | - |
| `CreditPurchase.test.tsx` | Achat crédits | ❌ Absent | - |

### Property (`__tests__/property/`)

| Fichier | Fonctionnalité | Statut | Couverture |
|---------|----------------|--------|------------|
| `property-form.onSubmit.test.ts` | Soumission formulaire | ✅ Présent | 🟡 Partiel |
| `property-form.utils.test.ts` | Utilitaires formulaire | ✅ Présent | 🟡 Partiel |
| `property.filter.test.ts` | Filtres | ✅ Présent | 🟡 Partiel |
| `property.list.test.ts` | Liste propriétés | ✅ Présent | 🟡 Partiel |
| `property.stat.test.ts` | Statistiques | ✅ Présent | 🟡 Partiel |

### Utilitaires (`__tests__/lib/`)

| Fichier | Fonctionnalité | Statut | Couverture |
|---------|----------------|--------|------------|
| `phoneValidation.test.ts` | Validation téléphone | ✅ Présent | 🟢 Bon |
| `formatters.test.ts` | Formatage données | ❌ Absent | - |
| `validators.test.ts` | Validateurs | ❌ Absent | - |

---

## 🔗 Tests d'Intégration

| Fichier | Scénario | Statut | Couverture |
|---------|----------|--------|------------|
| `property-lifecycle.test.ts` | Cycle de vie propriété | ✅ Présent | 🟡 Partiel |
| `user-journey.test.ts` | Parcours utilisateur | ✅ Présent | 🟡 Partiel |
| `credit-purchase.test.ts` | Achat de crédits | ❌ Absent | - |
| `promotion-flow.test.ts` | Flux promotion | ❌ Absent | - |
| `auth-flow.test.ts` | Flux authentification | ❌ Absent | - |

---

## 🌐 Tests E2E (End-to-End)

> ⚠️ **AUCUN TEST E2E ACTUELLEMENT**

| Scénario | Description | Statut |
|----------|-------------|--------|
| Parcours Visiteur | Navigation, consultation, inscription | ❌ À créer |
| Parcours Chercheur | Recherche, filtres, favoris | ❌ À créer |
| Parcours Annonceur | Publication, gestion, promotion | ❌ À créer |
| Parcours Admin | Configuration, modération | ❌ À créer |
| Flux Paiement | Achat crédits complet | ❌ À créer |

---

## 📁 Mocks Existants

| Fichier | Description | Qualité |
|---------|-------------|---------|
| `annonce.mock.ts` | Données de propriétés | 🟡 Basique |
| `user.mock.ts` | Données utilisateurs | 🟡 Basique |
| `next-auth.ts` | Mock NextAuth | 🟢 Bon |
| `utils.ts` | Utilitaires de test | 🟡 Basique |

### Mocks Manquants

- [ ] `firebase.mock.ts` - Mock complet Firebase
- [ ] `payment.mock.ts` - Mock paiement Airtel
- [ ] `factories/user.factory.ts` - Factory utilisateurs
- [ ] `factories/property.factory.ts` - Factory propriétés
- [ ] `factories/transaction.factory.ts` - Factory transactions

---

## 🎯 Objectifs de Couverture

| Métrique | Actuel | Objectif | Écart |
|----------|--------|----------|-------|
| Statements | ~30% | 70% | -40% |
| Branches | ~25% | 70% | -45% |
| Functions | ~30% | 70% | -40% |
| Lines | ~30% | 70% | -40% |

---

## 📋 Plan d'Action

### Priorité Haute (Sprint 1)

1. [ ] Créer `factories/user.factory.ts`
2. [ ] Créer `factories/property.factory.ts`
3. [ ] Créer `firebase.mock.ts` centralisé
4. [ ] Compléter `credit.service.test.ts`
5. [ ] Créer `payment.service.test.ts`

### Priorité Moyenne (Sprint 2)

1. [ ] Configurer Playwright pour E2E
2. [ ] Créer E2E parcours visiteur
3. [ ] Créer E2E parcours annonceur
4. [ ] Compléter tests composants React
5. [ ] Créer `credit-purchase.test.ts` (intégration)

### Priorité Basse (Sprint 3)

1. [ ] Tests de performance
2. [ ] Tests de sécurité
3. [ ] Tests d'accessibilité
4. [ ] Documentation tests

---

## 📈 Suivi Historique

| Date | Couverture | Tests Ajoutés | Notes |
|------|------------|---------------|-------|
| 2026-01-12 | ~30% | - | État initial documenté |

---

*Document mis à jour le : 2026-01-12*

