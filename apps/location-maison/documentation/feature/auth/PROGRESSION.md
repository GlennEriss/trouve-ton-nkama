# Progression FEATURE-001 : Register

> **Branche** : `feature/FEATURE-001-register`  
> **Objectif** : 100% de couverture de tests

---

## ✅ Phase 1 : Préparation - TERMINÉE

- [x] Créer branche `feature/FEATURE-001-register`
- [x] Analyser code existant en détail (`ANALYSE_CODE_EXISTANT.md`)
- [x] Identifier toutes les dépendances
- [x] Diagramme d'activité (`register-activity-diagram.puml`)
- [x] Diagramme de séquence (`register-sequence-diagram.puml`)
- [x] Spécifications UX (`ux.md`)
- [x] Spécifications UI (`ui.md`)

---

## ✅ Phase 2 : Repository - TERMINÉE

### Fichiers créés

1. **`src/features/auth/repositories/user.repository.interface.ts`**
   - Interface `UserRepository`
   - Classe `RepositoryError` pour gestion d'erreurs cohérente

2. **`src/features/auth/repositories/user.repository.ts`**
   - Implémentation `UserRepositoryImpl`
   - Méthodes : `create`, `findByPhoneNumber`, `findByEmail`, `findById`, `update`, `delete`
   - Gestion d'erreurs : Toujours `throw RepositoryError` (jamais null/false)

3. **`src/features/auth/repositories/__tests__/user.repository.test.ts`**
   - Tests unitaires complets (TDD)
   - Couverture cible : 100%
   - Tous les scénarios testés (succès, erreurs, cas limites)

4. **`src/features/auth/repositories/index.ts`**
   - Exports centralisés

### Méthodes implémentées

- ✅ `create(user: User): Promise<User>`
- ✅ `findByPhoneNumber(phoneNumber: string): Promise<User | null>`
- ✅ `findByEmail(email: string): Promise<User | null>`
- ✅ `findById(uid: string): Promise<User | null>`
- ✅ `update(uid: string, data: Partial<User>): Promise<User>`
- ✅ `delete(uid: string): Promise<void>` (soft delete)

### Tests créés

- ✅ `create` - Succès
- ✅ `create` - Erreur Firestore
- ✅ `create` - Tous les champs inclus
- ✅ `findByPhoneNumber` - Utilisateur trouvé
- ✅ `findByPhoneNumber` - Aucun utilisateur
- ✅ `findByPhoneNumber` - Erreur query
- ✅ `findByEmail` - Utilisateur trouvé
- ✅ `findByEmail` - Aucun utilisateur
- ✅ `findByEmail` - Erreur query
- ✅ `findById` - Utilisateur trouvé
- ✅ `findById` - Aucun utilisateur
- ✅ `findById` - Erreur query
- ✅ `update` - Succès
- ✅ `update` - Utilisateur non trouvé
- ✅ `update` - Erreur update
- ✅ `update` - Exclusion createdAt
- ✅ `delete` - Soft delete (ARCHIVED)
- ✅ `delete` - Utilisateur non trouvé
- ✅ `delete` - Erreur delete

**Total** : 19 tests unitaires

---

## 🔄 Phase 3 : Service - EN COURS

### À faire

- [ ] Créer `src/features/auth/services/auth.service.ts`
- [ ] Implémenter `signup(data: SignupData): Promise<SignupResult>`
- [ ] Intégration avec Firebase Auth
- [ ] Intégration avec UserRepository
- [ ] Gestion d'erreurs cohérente
- [ ] Tests unitaires (100% couverture)

---

## ⏳ Phase 4 : Hook - EN ATTENTE

- [ ] Créer `src/features/auth/hooks/useSignup.ts`
- [ ] Intégration avec service
- [ ] Gestion état (loading/error/success)
- [ ] Tests unitaires (100% couverture)

---

## ⏳ Phase 5 : Composant - EN ATTENTE

- [ ] Refactorer `SignupForm.tsx` (UI uniquement)
- [ ] Utiliser `useSignup` hook
- [ ] Validation Zod côté client
- [ ] Tests composant (React Testing Library, 100% couverture)

---

## ⏳ Phase 6 : Tests - EN ATTENTE

- [ ] Tests d'intégration (Firebase Emulator)
- [ ] Tests E2E (Playwright)
- [ ] Vérifier couverture >= 100%

---

## 📊 Métriques

### Couverture actuelle
- **Repository** : Tests créés (à exécuter pour vérifier 100%)

### Prochaines étapes
1. Exécuter les tests du repository pour vérifier la couverture
2. Passer à la Phase 3 : Service

---

*Dernière mise à jour : 2026-01-12*

