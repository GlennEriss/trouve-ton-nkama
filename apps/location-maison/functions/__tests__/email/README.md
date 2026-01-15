# Tests pour la Cloud Function sendVerificationEmail

Ce dossier contient les tests pour la Cloud Function d'envoi d'email de vérification.

## 📋 Types de tests

### 1. Tests unitaires (`verification.unit.test.ts`)
- **Mock complet** : Tous les services externes sont mockés (Firebase Auth, Secret Manager, Nodemailer)
- **Aucun email réel** : Aucun email n'est envoyé pendant ces tests
- **Exécution rapide** : Tests isolés et rapides
- **Usage** : `npm test -- verification.unit.test.ts`

### 2. Tests d'intégration (`verification.integration.test.ts`)
- **Mock de Nodemailer** : L'envoi d'email est mocké pour éviter les envois réels
- **Firebase réel** : Utilise de vrais utilisateurs Firebase (créés et supprimés automatiquement)
- **Aucun email réel** : Aucun email n'est envoyé pendant ces tests
- **Usage** : `npm test -- verification.integration.test.ts`

### 3. Test d'envoi réel (`verification.real-email.test.ts`) ⚠️
- **ENVOIE UN EMAIL RÉEL** : Ce test envoie vraiment un email via SMTP
- **Désactivé par défaut** : Nécessite une activation explicite
- **Usage** : Voir ci-dessous

## 🚀 Utilisation du test d'envoi réel

### Prérequis
1. Les secrets Firebase doivent être configurés (HOSTINGER_EMAIL_USER, HOSTINGER_EMAIL_PASS)
2. Une adresse email valide pour recevoir l'email de test

### Méthode 1 : Via la commande npm
```bash
cd functions
ENABLE_REAL_EMAIL_TEST=true TEST_REAL_EMAIL=your-email@example.com npm run test:real-email
```

### Méthode 2 : Directement avec Jest
```bash
cd functions
ENABLE_REAL_EMAIL_TEST=true TEST_REAL_EMAIL=your-email@example.com npm test -- verification.real-email.test.ts
```

### Exemple complet
```bash
# Depuis la racine du projet
cd functions
ENABLE_REAL_EMAIL_TEST=true TEST_REAL_EMAIL=test@example.com npm test -- verification.real-email.test.ts
```

## ⚠️ Important

- **Quotas SMTP** : Ce test envoie un email réel. Ne l'exécutez pas trop souvent pour respecter les quotas.
- **Activation explicite** : Le test est automatiquement skip si `ENABLE_REAL_EMAIL_TEST` n'est pas défini à `true`
- **Email requis** : `TEST_REAL_EMAIL` doit être défini avec une adresse email valide
- **Secrets requis** : Les secrets SMTP doivent être configurés (via Secret Manager ou variables d'environnement)

## 📊 Résumé des tests

| Test | Mocks | Email réel | Firebase réel | Usage |
|------|-------|------------|---------------|-------|
| Unitaires | ✅ Tous | ❌ Non | ❌ Non | Tests rapides, isolation complète |
| Intégration | ✅ Nodemailer | ❌ Non | ✅ Oui | Tests avec Firebase réel |
| Envoi réel | ❌ Aucun | ✅ **OUI** | ✅ Oui | Validation production |

## 🔒 Sécurité

- Les tests unitaires et d'intégration **ne peuvent pas** envoyer d'emails réels (mocks obligatoires)
- Le test d'envoi réel nécessite une **activation explicite** via variable d'environnement
- Par défaut, `npm test` n'exécute **pas** le test d'envoi réel
