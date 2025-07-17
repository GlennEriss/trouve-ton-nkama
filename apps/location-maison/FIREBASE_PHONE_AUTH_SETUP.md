# 📱 Configuration Firebase Phone Authentication

## 🎯 Problème Actuel

L'erreur `auth/invalid-app-credential` indique que Phone Authentication n'est pas correctement configuré dans Firebase Console.

## 🔧 Configuration Requise

### 1. Activer Phone Authentication

1. **Aller dans Firebase Console**
   - Ouvrir [Firebase Console](https://console.firebase.google.com/)
   - Sélectionner votre projet

2. **Activer Phone Authentication**
   - Aller dans **Authentication** > **Sign-in method**
   - Cliquer sur **Phone**
   - Activer **Phone** comme méthode de connexion
   - Sauvegarder

### 2. Configurer Recaptcha

1. **Dans Firebase Console**
   - Aller dans **Authentication** > **Settings**
   - Onglet **General**
   - Section **reCAPTCHA Enterprise**
   - Activer **reCAPTCHA Enterprise** ou utiliser **reCAPTCHA v3**

2. **Alternative : reCAPTCHA v3**
   - Aller dans [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
   - Créer un nouveau site
   - Type : **reCAPTCHA v3**
   - Domaines : `localhost`, `your-domain.com`
   - Copier la **Site Key** et **Secret Key**

### 3. Configurer les Numéros de Test

1. **Dans Firebase Console**
   - Aller dans **Authentication** > **Settings**
   - Onglet **General**
   - Section **Phone numbers for testing**
   - Ajouter les numéros de test :

```
+24101234567 (Code: 123456)
+24101234568 (Code: 654321)
+24101234569 (Code: 111111)
```

### 4. Variables d'Environnement

Ajouter dans `.env.local` :

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# reCAPTCHA (optionnel)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

## 🧪 Test de Configuration

### Test 1: Vérifier la Configuration

```bash
npm run test:sms
```

### Test 2: Test en Ligne

1. Aller sur `http://localhost:3000/test-sms`
2. Saisir un numéro de test : `+24101234567`
3. Cliquer sur "Tester avec notre Service"

### Test 3: Test Direct Firebase

1. Dans la page de test
2. Saisir un numéro de test
3. Cliquer sur "Envoyer Code OTP"
4. Vérifier les logs dans la console

## 🚨 Erreurs Courantes

### 1. "auth/invalid-app-credential"
**Cause :** Phone Authentication non activé ou Recaptcha mal configuré
**Solution :** Activer Phone Authentication dans Firebase Console

### 2. "auth/invalid-phone-number"
**Cause :** Numéro non autorisé
**Solution :** Ajouter le numéro dans les numéros de test

### 3. "auth/too-many-requests"
**Cause :** Trop de tentatives
**Solution :** Attendre quelques minutes

### 4. "auth/captcha-check-failed"
**Cause :** Recaptcha mal configuré
**Solution :** Vérifier la configuration reCAPTCHA

## 📋 Checklist de Configuration

- [ ] Phone Authentication activé dans Firebase Console
- [ ] reCAPTCHA configuré (v3 ou Enterprise)
- [ ] Numéros de test ajoutés
- [ ] Variables d'environnement configurées
- [ ] Application redémarrée après configuration

## 🔍 Debugging

### Vérifier la Configuration

```javascript
// Dans la console du navigateur
console.log('Firebase Config:', {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
});
```

### Vérifier l'Auth Object

```javascript
// Dans la console du navigateur
import { auth } from '@/firebase/auth';
console.log('Auth Object:', auth);
console.log('Auth Config:', auth.config);
```

## 🎯 Prochaines Étapes

1. **Configurer Firebase Console** selon ce guide
2. **Tester avec les numéros de test**
3. **Vérifier les logs** pour identifier les problèmes
4. **Configurer reCAPTCHA** si nécessaire

## 📞 Support

Si les problèmes persistent :
1. Vérifier les logs Firebase Console
2. Tester avec un numéro de téléphone réel
3. Vérifier la configuration reCAPTCHA
4. Contacter le support Firebase si nécessaire 