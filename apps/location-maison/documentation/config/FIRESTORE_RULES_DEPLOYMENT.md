# Règles Firestore à déployer

## Instructions

1. Allez dans la console Firebase : https://console.firebase.google.com/project/location-maison-dev/firestore/rules
2. Remplacez les règles actuelles (`allow read, write: if false;`) par les règles ci-dessous
3. Cliquez sur "Publier" (Publish)

## Règles complètes

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function isTransactionOperation() {
      return request.resource != null && 
             request.resource.data.diff(resource.data).affectedKeys().hasOnly(['credits', 'updatedAt']);
    }
    
    match /users/{userId} {
      // Lecture : l'utilisateur peut lire son propre profil, ou lecture publique pour vérification
      allow read: if true;
      
      // Création : lors de l'inscription, l'utilisateur authentifié peut créer son propre document
      // L'uid dans les données doit correspondre à l'utilisateur authentifié
      allow create: if isSignedIn() && request.auth.uid == request.resource.data.uid;
      
      // Mise à jour : l'utilisateur peut mettre à jour son propre profil
      allow update: if isSignedIn() && (
        // Soit l'utilisateur est le propriétaire
        request.auth.uid == resource.data.uid ||
        // Soit c'est une transaction atomique (pour les crédits)
        (isTransactionOperation() && request.auth.uid == request.resource.data.uid)
      );
    }
    
    match /notifications/{notificationId} {
      allow read, update: if isSignedIn() && request.auth.uid == resource.data.uid;
    }
    
    match /properties/{propertyId} {
      allow read: if true;
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn() && request.auth.uid == resource.data.uid;
    }
    
    match /suggestions/{suggestionId} {
      allow read: if true;
      allow write: if isSignedIn();
    }
    
    match /credit_transactions/{transactionId} {
      // Simplification des règles de lecture
      allow read: if isSignedIn() && (
        // L'utilisateur peut lire ses propres transactions
        request.auth.uid == resource.data.uid ||
        // Ou lire dans le contexte d'une transaction atomique
        (request.auth.uid == request.resource.data.uid)
      );
      
      // Création de transaction
      allow create: if isSignedIn() && request.auth.uid == request.resource.data.uid;
      
      // Mise à jour de transaction
      allow update: if isSignedIn() && request.auth.uid == resource.data.uid;
    }
    
    match /provinces/{provinceId} {
      allow read: if true;
      allow create, update: if isSignedIn();
    }
    
    match /cities/{cityId} {
      allow read: if true;
      allow create, update: if isSignedIn();
    }
    
    match /streets/{streetId} {
      allow read: if true;           
      allow create, update: if isSignedIn();  
    }

    match /property_statistics/{statisticsId} {
      // Tracking : création publique pour permettre le tracking des vues/interactions
      allow create: if true;
      
      // Lecture : uniquement pour le propriétaire de la propriété
      allow read: if isSignedIn() && request.auth.uid == resource.data.propertyOwnerId;
      
      // Mise à jour : uniquement le système (via Cloud Functions ou Admin SDK)
      // Les mises à jour se font via les API routes qui vérifient l'authentification côté serveur
      allow update: if false; // Désactivé côté client, uniquement via API routes/Admin SDK
      
      // Suppression : uniquement le propriétaire
      allow delete: if isSignedIn() && request.auth.uid == resource.data.propertyOwnerId;
    }
  }
}
```

## Explication des règles pour les utilisateurs

La règle importante pour la création d'utilisateurs est :

```javascript
match /users/{userId} {
  allow read: if true;  // Lecture publique (pour vérification)
  
  // Création : l'utilisateur authentifié peut créer son propre document
  // Condition : l'UID dans les données doit correspondre à l'UID de l'utilisateur authentifié
  allow create: if isSignedIn() && request.auth.uid == request.resource.data.uid;
  
  // Mise à jour : l'utilisateur peut mettre à jour son propre profil
  allow update: if isSignedIn() && (
    request.auth.uid == resource.data.uid ||
    (isTransactionOperation() && request.auth.uid == request.resource.data.uid)
  );
}
```

**Comment ça fonctionne :**
1. L'utilisateur s'inscrit avec Firebase Auth → obtient un UID
2. L'utilisateur est maintenant authentifié (`isSignedIn()` retourne `true`)
3. L'utilisateur peut créer un document dans `/users/{userId}` si :
   - Il est authentifié (`isSignedIn()`)
   - L'UID dans les données (`request.resource.data.uid`) correspond à son UID d'authentification (`request.auth.uid`)
4. Le document ID (`{userId}`) doit correspondre à l'UID (c'est pourquoi nous utilisons `setDoc` avec l'UID comme ID de document)

## Alternative : Déploiement via CLI

Pour déployer via CLI :

```bash
firebase use dev
firebase deploy --only firestore:rules
```

Ou pour tous les environnements :

```bash
# Dev
firebase use dev && firebase deploy --only firestore:rules

# Preprod
firebase use preprod && firebase deploy --only firestore:rules

# Prod
firebase use prod && firebase deploy --only firestore:rules
```

## Script de déploiement

Un script interactif est disponible : `scripts/deploy-firestore-rules.sh`

```bash
./scripts/deploy-firestore-rules.sh
```
