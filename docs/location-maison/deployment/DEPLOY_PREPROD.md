# Guide de Déploiement en Préprod

Ce guide explique comment déployer les Cloud Functions, les règles Firestore et les index Firestore en environnement de préprod.

## 📋 Prérequis

1. **Firebase CLI installé**
   ```bash
   npm install -g firebase-tools
   ```

2. **Connexion à Firebase**
   ```bash
   firebase login
   ```

3. **Projet préprod configuré**
   - Vérifier que `.firebaserc` contient le projet préprod :
     ```json
     {
       "projects": {
         "preprod": "location-maison-preprod"
       }
     }
     ```

4. **Secrets Firebase configurés**
   Les Cloud Functions nécessitent les secrets suivants :
   - `HOSTINGER_EMAIL_USER` : Email SMTP Hostinger
   - `HOSTINGER_EMAIL_PASS` : Mot de passe SMTP Hostinger
   - `EMAIL_DISPLAY_NAME` : Nom d'affichage pour les emails
   - `NEXT_PUBLIC_APP_URL` : URL de l'application préprod

## 🚀 Déploiement Automatique

### Option 1 : Script de déploiement (Recommandé)

Utilisez le script de déploiement automatique :

```bash
./scripts/deploy-preprod.sh
```

Le script va :
1. ✅ Vérifier la connexion Firebase
2. ✅ Vérifier le projet préprod
3. ✅ Déployer les Cloud Functions
4. ✅ Déployer les règles Firestore
5. ✅ Déployer les index Firestore

### Option 2 : Déploiement manuel

#### 1. Déployer les Cloud Functions

```bash
# Aller dans le dossier functions
cd functions

# Installer les dépendances (si nécessaire)
npm install

# Build des fonctions
npm run build

# Déployer
firebase deploy --only functions --project location-maison-preprod
```

#### 2. Déployer les règles Firestore

```bash
# Depuis la racine du projet
firebase deploy --only firestore:rules --project location-maison-preprod
```

#### 3. Déployer les index Firestore

```bash
# Depuis la racine du projet
firebase deploy --only firestore:indexes --project location-maison-preprod
```

## 🔐 Configuration des Secrets Firebase

Les secrets Firebase peuvent être configurés automatiquement depuis le fichier `.env.local.preprod`.

### Option 1 : Configuration automatique (Recommandé)

```bash
# Le script lit les valeurs depuis .env.local.preprod et les configure automatiquement
./scripts/configure-firebase-secrets-preprod.sh
```

Le script va :
1. ✅ Lire les valeurs depuis `.env.local.preprod`
2. ✅ Vérifier que les secrets essentiels sont présents
3. ✅ Configurer automatiquement tous les secrets Firebase

**Prérequis :** Le fichier `.env.local.preprod` doit contenir :
- `HOSTINGER_EMAIL_USER` : Email SMTP Hostinger
- `HOSTINGER_EMAIL_PASS` : Mot de passe SMTP Hostinger
- `EMAIL_DISPLAY_NAME` : Nom d'affichage (optionnel, défaut: "Trouve Ton Nkama")
- `NEXT_PUBLIC_APP_URL` : URL de l'application (optionnel, défaut: URL préprod)

### Option 2 : Configuration manuelle

Si vous préférez configurer manuellement :

```bash
# Pour chaque secret
firebase functions:secrets:set SECRET_NAME --project location-maison-preprod

# Exemples :
firebase functions:secrets:set HOSTINGER_EMAIL_USER --project location-maison-preprod
firebase functions:secrets:set HOSTINGER_EMAIL_PASS --project location-maison-preprod
firebase functions:secrets:set EMAIL_DISPLAY_NAME --project location-maison-preprod
firebase functions:secrets:set NEXT_PUBLIC_APP_URL --project location-maison-preprod
```

**Note :** Le script de déploiement (`deploy-preprod.sh`) détecte automatiquement les secrets manquants et propose de les configurer.

## 📊 Index Firestore

Les index Firestore sont définis dans `firestore.indexes.json`. Les index suivants sont nécessaires :

### Index pour les propriétés

1. **Status + CreatedAt** (pour les listes de propriétés)
   - Collection: `properties`
   - Champs: `status` (ASC), `createdAt` (DESC)

2. **Status + TypeProperty + CreatedAt** (pour les filtres par type)
   - Collection: `properties`
   - Champs: `status` (ASC), `typeProperty` (ASC), `createdAt` (DESC)

3. **Status + Province + CreatedAt** (pour les filtres par localisation)
   - Collection: `properties`
   - Champs: `status` (ASC), `province` (ASC), `createdAt` (DESC)

4. **Status + TypeProperty + Province + CreatedAt** (pour les filtres combinés)
   - Collection: `properties`
   - Champs: `status` (ASC), `typeProperty` (ASC), `province` (ASC), `createdAt` (DESC)

5. **Promotion StartDate** (pour les propriétés promues)
   - Collection: `properties`
   - Champs: `currentPromotion.startDate` (DESC)

### Index pour les transactions de crédit

6. **UID + CreatedAt** (pour l'historique des transactions)
   - Collection: `credit_transactions`
   - Champs: `uid` (ASC), `createdAt` (DESC)

### Index pour les notifications

7. **UID + CreatedAt** (pour les notifications utilisateur)
   - Collection: `notifications`
   - Champs: `uid` (ASC), `createdAt` (DESC)

**Note :** Les index peuvent prendre quelques minutes à être créés. Vérifiez leur statut dans la [console Firebase](https://console.firebase.google.com/project/location-maison-preprod/firestore/indexes).

## ✅ Vérification Post-Déploiement

### 1. Vérifier les Cloud Functions

```bash
# Lister les fonctions déployées
firebase functions:list --project location-maison-preprod

# Voir les logs
firebase functions:log --project location-maison-preprod
```

Ou via la console : https://console.firebase.google.com/project/location-maison-preprod/functions

### 2. Vérifier les règles Firestore

Tester les règles dans la console Firebase :
https://console.firebase.google.com/project/location-maison-preprod/firestore/rules

### 3. Vérifier les index Firestore

Vérifier le statut des index :
https://console.firebase.google.com/project/location-maison-preprod/firestore/indexes

Les index en cours de création afficheront "Building". Une fois terminés, ils afficheront "Enabled".

## 🧪 Tests Post-Déploiement

### Tester la Cloud Function sendVerificationEmail

```bash
# Via curl
curl -X POST https://us-central1-location-maison-preprod.cloudfunctions.net/sendVerificationEmail \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Tester les règles Firestore

Utiliser le simulateur de règles dans la console Firebase ou tester via l'application.

## 🐛 Dépannage

### Erreur : "Missing required secret"

Les secrets Firebase ne sont pas configurés. Configurez-les avec :

```bash
firebase functions:secrets:set SECRET_NAME --project location-maison-preprod
```

### Erreur : "Index not found"

Les index Firestore ne sont pas encore créés. Attendez quelques minutes et vérifiez dans la console Firebase.

### Erreur : "Permission denied"

Vérifiez que vous avez les permissions nécessaires sur le projet Firebase préprod.

## 📝 Checklist de Déploiement

Avant de déployer :

- [ ] Firebase CLI installé et à jour
- [ ] Connecté à Firebase (`firebase login`)
- [ ] Projet préprod configuré dans `.firebaserc`
- [ ] Secrets Firebase configurés
- [ ] Code des fonctions testé localement
- [ ] Règles Firestore testées
- [ ] Index Firestore définis dans `firestore.indexes.json`

Après le déploiement :

- [ ] Cloud Functions déployées et actives
- [ ] Règles Firestore déployées
- [ ] Index Firestore en cours de création ou créés
- [ ] Tests de la fonction `sendVerificationEmail` réussis
- [ ] Tests des règles Firestore réussis

## 🔗 Liens Utiles

- **Console Firebase Préprod** : https://console.firebase.google.com/project/location-maison-preprod
- **Cloud Functions** : https://console.firebase.google.com/project/location-maison-preprod/functions
- **Firestore** : https://console.firebase.google.com/project/location-maison-preprod/firestore
- **Index Firestore** : https://console.firebase.google.com/project/location-maison-preprod/firestore/indexes
- **Règles Firestore** : https://console.firebase.google.com/project/location-maison-preprod/firestore/rules

## 📚 Documentation

- [Documentation Firebase Functions](https://firebase.google.com/docs/functions)
- [Documentation Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Documentation Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
