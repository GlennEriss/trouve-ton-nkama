# 🔧 Guide de Résolution des Problèmes - SMS Firebase

## 🚨 Erreur `auth/invalid-app-credential`

### Problème
```
FirebaseError: auth/invalid-app-credential
```

### Solutions

#### 1. Vérifier la Configuration Firebase Console

**Étape 1: Activer Phone Authentication**
1. Aller dans [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner votre projet
3. Aller dans **Authentication** > **Sign-in method**
4. Cliquer sur **Phone**
5. Activer **Phone** comme méthode de connexion
6. Sauvegarder

**Étape 2: Configurer reCAPTCHA Enterprise**
1. Dans **Authentication** > **Settings**
2. Onglet **General**
3. Section **reCAPTCHA Enterprise**
4. Activer **reCAPTCHA Enterprise**
5. Ou utiliser **reCAPTCHA v3** (alternative)

**Étape 3: Vérifier le Plan Blaze**
1. Aller dans **Usage and billing**
2. S'assurer que le plan **Blaze** est activé
3. Vérifier que la facturation est configurée

#### 2. Vérifier les Variables d'Environnement

```env
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

#### 3. Redémarrer le Serveur

```bash
# Arrêter le serveur
Ctrl+C

# Redémarrer
npm run dev
```

#### 4. Vérifier les Domaines Autorisés

1. Dans Firebase Console > **Authentication** > **Settings**
2. Onglet **General**
3. Section **Authorized domains**
4. Ajouter :
   - `localhost`
   - `your-domain.com`
   - `your-domain.vercel.app` (si déployé sur Vercel)

## 🧪 Tests de Diagnostic

### Test 1: Script de Diagnostic

```bash
node scripts/diagnostic-firebase-sms.js
```

### Test 2: Page de Test

1. Aller sur `http://localhost:3000/test-real-sms`
2. Saisir un numéro de téléphone
3. Cliquer sur "Envoyer SMS"
4. Vérifier les logs dans la console

### Test 3: Console du Navigateur

Ouvrir les outils de développement (F12) et vérifier :

```javascript
// Dans la console
import { auth } from '@/firebase/auth';
console.log('Auth object:', auth);
console.log('Current user:', auth.currentUser);
```

## 🔄 Corrections de Code

### 1. RecaptchaVerifier Correct

```typescript
// ❌ Incorrect
new RecaptchaVerifier(auth, containerId, options);

// ✅ Correct
new RecaptchaVerifier(containerId, options, auth);
```

### 2. Initialisation Firebase

```typescript
// ✅ Correct
import { getAuth } from 'firebase/auth';
import { app } from './app';

export const auth = getAuth(app);
```

### 3. Gestion des Erreurs

```typescript
try {
  const confirmationResult = await signInWithPhoneNumber(
    auth,
    phoneNumber,
    recaptchaVerifier
  );
} catch (error: any) {
  if (error.code === 'auth/invalid-app-credential') {
    console.error('Erreur de configuration Firebase');
  } else if (error.code === 'auth/invalid-phone-number') {
    console.error('Numéro de téléphone invalide');
  }
}
```

## 📱 Numéros de Test

### Configuration Firebase Console

1. Aller dans **Authentication** > **Settings**
2. Onglet **General**
3. Section **Phone numbers for testing**
4. Ajouter :

```
+24101234567 (Code: 123456)
+24101234568 (Code: 654321)
+24101234569 (Code: 111111)
```

### Utilisation

```typescript
// En développement
const testPhoneNumbers = [
  '+24101234567',
  '+24101234568',
  '+24101234569'
];

const testCodes = [
  '123456',
  '654321',
  '111111'
];
```

## 🚀 Production

### 1. Plan Blaze Requis

- Firebase Phone Auth nécessite le plan Blaze
- Facturation par SMS envoyé
- Limites de taux configurées

### 2. Domaines de Production

```typescript
// Ajouter dans Firebase Console
your-domain.com
your-domain.vercel.app
```

### 3. Variables d'Environnement de Production

```env
# Production
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_production_project_id
```

## 🔍 Debugging Avancé

### 1. Logs Détaillés

```typescript
console.log('Firebase Config:', firebaseConfig);
console.log('Auth Object:', auth);
console.log('RecaptchaVerifier:', recaptchaVerifier);
console.log('Phone Number:', phoneNumber);
```

### 2. Vérification des Imports

```typescript
// Vérifier que tous les imports sont corrects
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  PhoneAuthProvider 
} from 'firebase/auth';
```

### 3. Test de Connexion Firebase

```typescript
// Test simple
import { auth } from '@/firebase/auth';
console.log('Firebase Auth initialisé:', !!auth);
```

## 📞 Support

Si les problèmes persistent :

1. **Vérifier les logs** dans la console du navigateur
2. **Tester avec les numéros de test** Firebase
3. **Vérifier la configuration** Firebase Console
4. **Redémarrer le serveur** après les modifications
5. **Vérifier le plan Blaze** pour l'envoi de SMS réels

## ✅ Checklist de Résolution

- [ ] Phone Authentication activé dans Firebase Console
- [ ] reCAPTCHA Enterprise configuré
- [ ] Plan Blaze activé
- [ ] Variables d'environnement définies
- [ ] Domaines autorisés configurés
- [ ] Serveur redémarré
- [ ] Code RecaptchaVerifier corrigé
- [ ] Tests avec numéros de test réussis 