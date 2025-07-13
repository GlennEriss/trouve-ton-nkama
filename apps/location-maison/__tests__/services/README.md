# Tests des Services - Application Immobilière

Ce répertoire contient les tests unitaires et d'intégration pour tous les services de l'application immobilière Trouve Ton Nkama.

## 📁 Structure des Tests

```
__tests__/services/
├── ai-prompts.service.test.ts     # Service IA Assistant (8 tests)
├── payment.service.test.ts        # Paiements Airtel Money (35 tests)
├── notification.service.test.ts   # Service notifications (25 tests)
├── geocoding.service.test.ts      # Géolocalisation/Geocoding (40 tests)
├── search.service.test.ts         # Recherche Algolia (45 tests)
└── README.md                      # Documentation (ce fichier)
```

## 🧪 Description des Services Testés

### 1. AI Prompts Service (`ai-prompts.service.test.ts`)
**Tests : 8** | **Service : Assistant IA immobilier**

Teste la génération de prompts pour l'assistant IA qui aide les utilisateurs à créer des annonces immobilières de qualité.

**Fonctionnalités testées :**
- ✅ Prompt système principal
- ✅ Analyse de formulaires de propriétés
- ✅ Suggestions de tags
- ✅ Amélioration de descriptions
- ✅ Estimation de prix
- ✅ Conseils de localisation
- ✅ Génération automatique (AutoFill)
- ✅ Prompts contextuels

**Points clés :**
- Validation de la cohérence des prompts en français
- Tests avec différents contextes (étapes de formulaire)
- Vérification des mots-clés immobiliers

### 2. Payment Service (`payment.service.test.ts`)
**Tests : 35** | **Service : Paiements Airtel Money**

Teste l'intégration complète avec l'API Airtel Money pour les achats de crédits.

**Fonctionnalités testées :**
- ✅ Validation des numéros Airtel Gabon
- ✅ Formatage des numéros de téléphone
- ✅ Configuration des credentials
- ✅ Initiation de paiements
- ✅ Vérification de statuts
- ✅ Gestion des erreurs OAuth
- ✅ Flux complet de paiement
- ✅ Sécurité et validation

**Points clés :**
- Tests avec numéros Airtel valides/invalides du Gabon
- Simulation des réponses API Airtel
- Gestion des timeouts et erreurs réseau
- Masquage des données sensibles dans les logs

### 3. Notification Service (`notification.service.test.ts`)
**Tests : 25** | **Service : Notifications utilisateur**

Teste la création et gestion des notifications pour différents événements de l'application.

**Fonctionnalités testées :**
- ✅ Notifications de bienvenue
- ✅ Notifications de favoris (BOOKMARKING)
- ✅ Notifications de paiement
- ✅ Notifications de propriétés approuvées
- ✅ Notifications de profil incomplet
- ✅ Types de notifications SECURITY
- ✅ Métadonnées étendues
- ✅ Flux d'intégration complets

**Points clés :**
- Support des types BOOKMARKING et SECURITY
- Flux bidirectionnel pour les favoris
- Intégration avec le cycle de vie utilisateur
- Gestion des données personnalisées

### 4. Geocoding Service (`geocoding.service.test.ts`)
**Tests : 40** | **Service : Géolocalisation**

Teste les services de géolocalisation pour le reverse et forward geocoding spécifique au Gabon.

**Fonctionnalités testées :**
- ✅ Reverse geocoding (coordonnées → adresse)
- ✅ Forward geocoding (recherche d'adresses)
- ✅ Validation des coordonnées
- ✅ Filtrage par pays (Gabon)
- ✅ Gestion du cache
- ✅ API Nominatim et Overpass
- ✅ Intégration LocationProvider
- ✅ Cas limites et erreurs

**Points clés :**
- Tests spécifiques aux villes du Gabon
- Validation des coordonnées aux frontières
- Gestion des caractères spéciaux
- Performance et mise en cache

### 5. Search Service (`search.service.test.ts`)
**Tests : 45** | **Service : Recherche Algolia**

Teste l'intégration complète avec Algolia pour la recherche de propriétés immobilières.

**Fonctionnalités testées :**
- ✅ Configuration client Algolia
- ✅ Recherche textuelle avec typo-tolérance
- ✅ Filtres par type, localisation, prix, superficie
- ✅ Facettes et agrégations
- ✅ Pagination et tri
- ✅ Recherche géographique
- ✅ Performance et monitoring
- ✅ Intégration hooks React InstantSearch

**Points clés :**
- Tests des filtres combinés
- Recherche géographique autour des villes
- Facettes par type de propriété et ville
- Intégration avec les composants React

## 🚀 Exécution des Tests

### Tests individuels par service
```bash
# Tests IA Assistant
npm test __tests__/services/ai-prompts.service.test.ts

# Tests Paiements Airtel
npm test __tests__/services/payment.service.test.ts

# Tests Notifications
npm test __tests__/services/notification.service.test.ts

# Tests Géolocalisation
npm test __tests__/services/geocoding.service.test.ts

# Tests Recherche Algolia
npm test __tests__/services/search.service.test.ts
```

### Tous les tests de services
```bash
npm test __tests__/services/
```

### Tests avec couverture
```bash
npm test __tests__/services/ --coverage
```

### Tests en mode watch
```bash
npm test __tests__/services/ --watch
```

## 📊 Couverture et Métriques

### Objectifs de Couverture
- **Statements** : > 85%
- **Branches** : > 80%  
- **Functions** : > 90%
- **Lines** : > 85%

### Métriques par Service
| Service | Tests | Couverture | Priorité |
|---------|-------|------------|----------|
| AI Prompts | 8 | 🟢 90%+ | NORMAL |
| Payment | 35 | 🔴 95%+ | CRITIQUE |
| Notification | 25 | 🟡 85%+ | IMPORTANT |
| Geocoding | 40 | 🟡 80%+ | IMPORTANT |
| Search | 45 | 🟡 85%+ | IMPORTANT |

## 🛠 Technologies et Mocks

### Frameworks de Test
- **Jest** : Framework de test principal
- **@jest/globals** : Types TypeScript pour Jest
- **Testing Library** : Utilitaires de test React (pour search)

### Mocks Utilisés
- **Firebase/Firestore** : Mocks des opérations base de données
- **Fetch API** : Mock pour les appels HTTP
- **Algolia** : Mock du client de recherche
- **React InstantSearch** : Mock des hooks de recherche
- **Firebase Functions** : Mock du logger

### Services Externes Mockés
- **API Airtel Money** : Simulation OAuth et paiements
- **API Nominatim** : Simulation géocodage
- **Algolia Search** : Simulation recherche et facettes
- **Firebase Firestore** : Simulation base de données

## �� Cas d'Usage Métier Testés

### Flux Paiement Complet
1. Validation numéro Airtel Gabon
2. Initiation paiement via API
3. Vérification statut transaction
4. Gestion erreurs et timeouts

### Flux Notification Bidirectionnel
1. Ajout propriété aux favoris
2. Notification au propriétaire
3. Notification à l'utilisateur
4. Gestion des métadonnées

### Flux Recherche Avancée
1. Recherche textuelle avec typos
2. Application de filtres multiples
3. Recherche géographique
4. Pagination des résultats

### Flux Géolocalisation
1. Obtention coordonnées utilisateur
2. Reverse geocoding vers adresse
3. Cache et optimisation
4. Gestion erreurs API

### Flux Assistant IA
1. Analyse formulaire propriété
2. Génération prompts contextuels
3. Suggestions d'amélioration
4. Validation prompts français

## 🔧 Configuration et Environnement

### Variables d'Environnement Requises
```bash
# Airtel Money (tests paiements)
AIRTEL_CLIENT_ID=test_client_id
AIRTEL_CLIENT_SECRET=test_client_secret
AIRTEL_MERCHANT_ID=test_merchant_id
AIRTEL_WEBHOOK_SECRET=test_webhook_secret

# Algolia (tests recherche)
NEXT_PUBLIC_ALGOLIA_APP_ID=test_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=test_search_key
```

### Configuration Jest
Les tests utilisent la configuration Jest du projet principal avec :
- Support TypeScript
- Mocks automatiques des modules externes
- Transformation des imports ES6
- Collecte de couverture activée

## 📈 Évolution et Maintenance

### Prochaines Étapes
1. **Tests E2E** : Playwright pour flux complets
2. **Tests Performance** : Métriques temps réponse
3. **Tests A/B** : Variantes prompts IA
4. **Tests Charge** : Montée en charge Algolia

### Maintenance
- **Hebdomadaire** : Vérification passage tests
- **Mensuelle** : Analyse couverture et métriques
- **Trimestrielle** : Mise à jour mocks selon évolutions API
- **Semestrielle** : Refactoring et optimisation

## 🔍 Debugging et Troubleshooting

### Tests qui échouent
```bash
# Debugging avec logs détaillés
npm test __tests__/services/ --verbose

# Un seul test spécifique
npm test -t "nom du test spécifique"

# Mode debug avec breakpoints
npm test __tests__/services/ --runInBand --no-cache
```

### Problèmes Courants
1. **Mocks non configurés** : Vérifier imports des modules mockés
2. **Timeouts** : Augmenter timeout Jest si nécessaire
3. **Variables env** : S'assurer que les variables de test sont définies
4. **Cache Jest** : Nettoyer avec `npm test --clearCache`

---

**Dernière mise à jour** : Décembre 2024  
**Mainteneur** : Équipe Trouve Ton Nkama  
**Contact** : dev@logisgabon.com
