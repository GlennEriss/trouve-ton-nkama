# 🚀 Setup Airtel Money - Phase 1 Terminée ✅

## 📁 Structure créée

### Cloud Functions (`functions/src/payments/airtel/`)
- `types.ts` - Types TypeScript pour Airtel Money
- `config.ts` - Configuration et utilitaires ✅ (URLs UAT corrigées)
- `database.ts` - Fonctions Firestore pour les transactions ✅ (Requêtes UID corrigées)
- `initiatePurchase.ts` - Cloud Function pour initier les achats
- `index.ts` - Export des fonctions

### Routes API (`src/app/api/credits/`)
- `purchase/route.ts` - POST pour initier un achat ✅
- `balance/route.ts` - GET pour récupérer le solde ✅ (Requête UID corrigée)
- `history/route.ts` - GET pour l'historique des transactions ✅

### Configuration Firebase
- `src/firebase/server.ts` - Export des services Firebase Admin ✅

## 🔧 Configuration des variables d'environnement

### 1. Créer le fichier `.env.local`

Créez le fichier `.env.local` à la racine du projet avec ce contenu :

```bash
# 🔐 Variables d'environnement - LogisGabon
# ⚠️  NE PAS COMMITER CE FICHIER

# === AIRTEL MONEY CONFIGURATION (UAT/Staging) ===
AIRTEL_CLIENT_ID=your_uat_client_id_here
AIRTEL_CLIENT_SECRET=your_uat_client_secret_here
AIRTEL_MERCHANT_ID=your_uat_merchant_id_here
AIRTEL_WEBHOOK_SECRET=your_webhook_secret_here

# === ENVIRONMENT ===
NODE_ENV=development
```

### 2. URLs Airtel Money configurées

✅ **Staging (UAT)** : `https://openapiuat.airtel.africa/merchant/v1`  
🏭 **Production** : `https://openapi.airtel.africa/merchant/v1`

L'environnement est automatiquement sélectionné selon `NODE_ENV`.

### 3. Configurer Firebase Functions

Ajoutez les variables dans Firebase Functions :

```bash
cd functions
firebase functions:config:set \
  airtel.client_id="YOUR_UAT_CLIENT_ID" \
  airtel.client_secret="YOUR_UAT_CLIENT_SECRET" \
  airtel.merchant_id="YOUR_UAT_MERCHANT_ID" \
  airtel.webhook_secret="YOUR_WEBHOOK_SECRET"
```

## 📊 Structure Firestore ✅ CORRIGÉE

### Collection `users` 
⚠️ **Important** : L'ID du document ≠ UID Firebase

```typescript
// Document ID: généré automatiquement par Firestore
{
  uid: string               // UID Firebase (utilisé pour les requêtes)
  credits: number           // Solde de crédits (ajouté par notre système)
  createdAt: Timestamp     // Date de création
  updatedAt: Timestamp     // Dernière mise à jour
  // ... autres champs existants (firstname, lastname, email, etc.)
}
```

### Collection `credit_transactions`
```typescript
{
  id: string                    // ID unique de transaction
  userId: string               // UID Firebase de l'utilisateur
  packId: string              // ID du pack acheté
  credits: number             // Nombre de crédits
  amount: number              // Montant en FCFA
  status: string              // pending | success | failed | cancelled
  provider: 'airtel_money'    // Fournisseur de paiement
  airtelTransactionId?: string // ID transaction Airtel
  airtelMoneyId?: string      // ID Airtel Money
  phoneNumber?: string        // Numéro de téléphone
  createdAt: Timestamp        // Date de création
  updatedAt: Timestamp        // Dernière mise à jour
  completedAt?: Timestamp     // Date de completion
  failureReason?: string      // Raison d'échec
}
```

## 🎯 Packs de crédits configurés

| Pack | Crédits | Prix (FCFA) | Économies |
|------|---------|-------------|-----------|
| Starter | 5 | 2000 | - |
| Standard | 10 | 3500 | 12.5% |
| Avancé | 25 | 7500 | 25% |
| Premium | 50 | 12500 | 37.5% |

## 🔥 Déploiement Cloud Functions

```bash
# Depuis le dossier functions/
cd functions
npm run build
firebase deploy --only functions:initiatePurchase
```

## 🧪 Test de l'API

### 1. Récupérer le solde
```bash
curl -X GET "http://localhost:3000/api/credits/balance" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### 2. Initier un achat (mode simulation)
```bash
curl -X POST "http://localhost:3000/api/credits/purchase" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "packId": "standard",
    "phoneNumber": "+241 XX XX XX XX"
  }'
```

### 3. Récupérer l'historique
```bash
curl -X GET "http://localhost:3000/api/credits/history?limit=10&type=purchases" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

## ✅ Phase 1 : Setup de base - TERMINÉE

- ✅ Configuration Cloud Functions
- ✅ Structure Firestore  
- ✅ Routes API basiques avec simulation
- ✅ Types TypeScript complets
- ✅ Validation des numéros Airtel Gabon
- ✅ Gestion d'erreurs robuste
- ✅ Crédits de bienvenue (3 crédits gratuits)
- ✅ Configuration Firebase Admin corrigée
- ✅ Erreurs de linting résolues
- ✅ URLs Airtel Money UAT/Production corrigées
- ✅ **Requêtes utilisateurs corrigées (where uid == userId)**

## 🔧 Corrections importantes apportées

1. **Types de données** : Correction des conflits `FieldValue` vs `Date`
2. **Imports Firebase** : Utilisation de `adminAuth` existant
3. **Routes API** : Mode simulation en attendant l'intégration Airtel
4. **Configuration Airtel** : URLs UAT vs Production corrigées
5. **🚨 Structure utilisateurs** : Requêtes `where('uid', '==', userId)` au lieu de `.doc(userId)`
6. **Gestion des crédits** : Ajout sécurisé du champ `credits` si inexistant

## 🚨 **Point d'attention critique**

Votre collection `users` utilise :
- **ID de document** : généré automatiquement par Firestore  
- **Champ `uid`** : contient l'UID Firebase

Toutes nos fonctions utilisent maintenant des requêtes `where('uid', '==', userId)` pour trouver le bon document utilisateur.

## 🎯 Prochaine étape : Phase 2

Phase 2 : Intégration Airtel Money
- Implémentation API Airtel Money dans `initiatePurchase.ts`
- Tests avec sandbox UAT Airtel
- Interface frontend pour sélection des packs
- Connexion réelle Cloud Function ↔ Route API 