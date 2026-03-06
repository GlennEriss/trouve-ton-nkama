# 🚀 Configuration Production - SMS Firebase

## 🎯 Vue d'ensemble

Ce guide explique comment configurer Firebase Phone Authentication pour la production afin que les vrais SMS soient envoyés aux utilisateurs.

## 🔧 Configuration Firebase Console

### 1. Activer Phone Authentication

1. **Aller dans Firebase Console**
   - Ouvrir [Firebase Console](https://console.firebase.google.com/)
   - Sélectionner votre projet

2. **Activer Phone Authentication**
   - Aller dans **Authentication** → **Sign-in method**
   - Cliquer sur **Phone**
   - **Activer** Phone comme méthode de connexion
   - Sauvegarder

### 2. Configurer reCAPTCHA Enterprise

1. **Dans Firebase Console**
   - Aller dans **Authentication** → **Settings**
   - Onglet **General**
   - Section **reCAPTCHA Enterprise**
   - **Activer reCAPTCHA Enterprise**

2. **Avantages de reCAPTCHA Enterprise**
   - ✅ Configuration automatique
   - ✅ Protection avancée contre les bots
   - ✅ Pas de clé API à gérer
   - ✅ Intégration native Firebase

### 3. Configurer les Domaines Autorisés

1. **Dans Firebase Console**
   - Aller dans **Authentication** → **Settings**
   - Onglet **Authorized domains**
   - Ajouter vos domaines :
     ```
     your-domain.com
     www.your-domain.com
     ```

## 🌍 Variables d'Environnement Production

### Fichier `.env.production`

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Environment
NODE_ENV=production

# reCAPTCHA v3 (si App Check n'est pas géré exclusivement par Firebase Console)
NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY=your_recaptcha_v3_site_key
RECAPTCHA_V3_SECRET_KEY=your_recaptcha_v3_secret_key
```

### Fichier `.env.local` (développement)

```env
# Firebase Configuration (développement)
NEXT_PUBLIC_FIREBASE_API_KEY=your_dev_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Environment
NODE_ENV=development
```

## 🚀 Déploiement

### 1. Build de Production

```bash
# Build pour la production
npm run build

# Ou avec les variables de production
NODE_ENV=production npm run build
```

### 2. Déploiement Vercel

```bash
# Déployer sur Vercel
vercel --prod

# Ou avec les variables d'environnement
vercel --prod --env NODE_ENV=production
```

### 3. Variables d'Environnement Vercel

Dans Vercel Dashboard :
1. **Settings** → **Environment Variables**
2. **Ajouter toutes les variables Firebase**
3. **Sélectionner "Production"**

## 🧪 Test en Production

### 1. Test avec de Vrais Numéros

```javascript
// Dans la console du navigateur
const testPhoneNumber = '+24101234567'; // Vrai numéro
const phoneVerificationService = PhoneVerificationService.getInstance();

// Initialiser et envoyer le code
await phoneVerificationService.initializeRecaptcha('recaptcha-container');
const result = await phoneVerificationService.sendOTP(testPhoneNumber);
console.log('Résultat:', result);
```

### 2. Vérification du Code

```javascript
// Vérifier le code reçu par SMS
const verificationResult = await phoneVerificationService.verifyOTP(
  result.verificationId,
  '123456', // Code reçu par SMS
  userData
);
```

## 📊 Monitoring et Logs

### 1. Firebase Console

- **Authentication** → **Users** : Voir les utilisateurs vérifiés
- **Authentication** → **Sign-in method** : Statistiques d'utilisation
- **Functions** → **Logs** : Logs des fonctions (si utilisées)

### 2. Vercel Analytics

- **Analytics** → **Web Vitals** : Performance de l'application
- **Functions** → **Logs** : Logs des API routes

### 3. Logs Personnalisés

```javascript
// Dans le service
console.log('SMS envoyé à:', phoneNumber);
console.log('VerificationId:', confirmationResult.verificationId);
console.log('Utilisateur créé:', userCredential.user.uid);
```

## 🔒 Sécurité Production

### 1. Rate Limiting

```javascript
// Dans le service
const MAX_ATTEMPTS_PER_HOUR = 5;
const MAX_ATTEMPTS_PER_DAY = 20;

// Vérifier les tentatives
const attempts = await getPhoneVerificationAttempts(phoneNumber);
if (attempts.hourly >= MAX_ATTEMPTS_PER_HOUR) {
  throw new Error('Trop de tentatives. Réessayez plus tard.');
}
```

### 2. Validation des Numéros

```javascript
// Validation du format international
const phoneRegex = /^\+[1-9]\d{1,14}$/;
if (!phoneRegex.test(phoneNumber)) {
  throw new Error('Format de numéro invalide');
}
```

### 3. Protection contre les Abus

```javascript
// Vérifier les numéros suspects
const suspiciousNumbers = ['+1234567890', '+0000000000'];
if (suspiciousNumbers.includes(phoneNumber)) {
  throw new Error('Numéro non autorisé');
}
```

## 💰 Coûts et Facturation

### 1. Coûts Firebase

- **Phone Authentication** : Gratuit jusqu'à 10,000 vérifications/mois
- **reCAPTCHA Enterprise** : Payant selon l'utilisation
- **SMS** : Payant selon le fournisseur

### 2. Estimation des Coûts

```
10,000 vérifications/mois = Gratuit
100,000 vérifications/mois = ~$100-200
1,000,000 vérifications/mois = ~$1000-2000
```

### 3. Optimisation des Coûts

```javascript
// Réutiliser les sessions de vérification
const session = await getVerificationSession(phoneNumber);
if (session && session.isValid) {
  return session.verificationId;
}
```

## 🚨 Problèmes Courants

### 1. "auth/invalid-app-credential"
**Cause :** reCAPTCHA mal configuré
**Solution :** Activer reCAPTCHA Enterprise dans Firebase Console

### 2. "auth/invalid-phone-number"
**Cause :** Numéro non autorisé ou format invalide
**Solution :** Vérifier le format international (+24101234567)

### 3. "auth/too-many-requests"
**Cause :** Trop de tentatives
**Solution :** Implémenter un rate limiting

### 4. "auth/captcha-check-failed"
**Cause :** reCAPTCHA échoué
**Solution :** Vérifier la configuration reCAPTCHA

## 📋 Checklist Production

- [ ] Phone Authentication activé dans Firebase Console
- [ ] reCAPTCHA Enterprise configuré
- [ ] Domaines autorisés ajoutés
- [ ] Variables d'environnement production configurées
- [ ] Rate limiting implémenté
- [ ] Validation des numéros ajoutée
- [ ] Monitoring configuré
- [ ] Tests avec de vrais numéros effectués

## 🎯 Prochaines Étapes

1. **Configurer Firebase Console** selon ce guide
2. **Déployer en production** avec les bonnes variables
3. **Tester avec de vrais numéros**
4. **Monitorer les coûts et l'utilisation**
5. **Optimiser selon les besoins**

## 📞 Support

Si des problèmes persistent :
1. Vérifier les logs Firebase Console
2. Tester avec différents numéros
3. Vérifier la configuration reCAPTCHA
4. Contacter le support Firebase 
