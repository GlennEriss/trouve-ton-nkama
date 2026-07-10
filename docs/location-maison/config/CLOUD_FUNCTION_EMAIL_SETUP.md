# Configuration de la Cloud Function d'Envoi d'Email

## 📧 Cloud Function : `sendVerificationEmail`

Cette Cloud Function HTTP permet d'envoyer des emails de vérification aux utilisateurs lors de leur inscription.

## 🔧 Configuration des Variables d'Environnement

Les Cloud Functions Firebase utilisent des **secrets** pour stocker les variables d'environnement sensibles.

### Option 1 : Via Firebase CLI (Recommandé)

```bash
# Configurer les secrets
firebase functions:secrets:set HOSTINGER_EMAIL_USER
firebase functions:secrets:set HOSTINGER_EMAIL_PASS
firebase functions:secrets:set EMAIL_DISPLAY_NAME
firebase functions:secrets:set NEXT_PUBLIC_APP_URL
```

### Option 2 : Via Firebase Console

1. Allez dans **Firebase Console** > **Functions** > **Configuration**
2. Ajoutez les variables suivantes :
   - `HOSTINGER_EMAIL_USER` : Email Hostinger SMTP
   - `HOSTINGER_EMAIL_PASS` : Mot de passe Hostinger SMTP
   - `EMAIL_DISPLAY_NAME` : Nom d'affichage (ex: "Trouve Ton Nkama")
   - `NEXT_PUBLIC_APP_URL` : URL de l'application (ex: "https://tonnkama.com")

## 🚀 Déploiement

```bash
# Déployer uniquement la fonction d'email
firebase deploy --only functions:sendVerificationEmail

# Ou déployer toutes les fonctions
firebase deploy --only functions
```

## 📝 Utilisation

### Depuis le Frontend (Next.js)

```typescript
const response = await fetch('https://us-central1-location-maison-dev.cloudfunctions.net/sendVerificationEmail', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    uid: 'user-uid', // ou email: 'user@example.com'
  }),
});
```

### Depuis une autre Cloud Function

```typescript
import * as functions from 'firebase-functions/v1';
import * as https from 'https';

export const myFunction = functions.https.onRequest(async (req, res) => {
  const response = await fetch('https://us-central1-location-maison-dev.cloudfunctions.net/sendVerificationEmail', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: 'user-uid',
    }),
  });
  
  const data = await response.json();
  res.json(data);
});
```

## 🔍 Vérification

Après le déploiement, vérifiez que la fonction est active :

```bash
# Voir les logs
firebase functions:log --only sendVerificationEmail

# Tester la fonction
curl -X POST https://us-central1-location-maison-dev.cloudfunctions.net/sendVerificationEmail \
  -H "Content-Type: application/json" \
  -d '{"uid": "test-user-uid"}'
```

## ⚠️ Notes Importantes

1. **Quota Firebase** : Si vous rencontrez une erreur "Quota exceeded", attendez quelques minutes avant de réessayer.

2. **Variables d'environnement** : Les secrets Firebase sont différents des variables d'environnement classiques. Utilisez `firebase functions:secrets:set` pour les configurer.

3. **URL de la fonction** : L'URL de la fonction change selon l'environnement :
   - **DEV** : `https://us-central1-location-maison-dev.cloudfunctions.net/sendVerificationEmail`
   - **PREPROD** : `https://us-central1-location-maison-preprod.cloudfunctions.net/sendVerificationEmail`
   - **PROD** : `https://us-central1-location-maison-prod-167da.cloudfunctions.net/sendVerificationEmail`

4. **CORS** : La fonction accepte les requêtes CORS depuis n'importe quelle origine. Pour la production, vous pouvez restreindre cela.

## 🔄 Migration depuis la Route API Next.js

Si vous souhaitez migrer de la route API Next.js (`/api/auth/send-verification-email`) vers la Cloud Function :

1. Mettez à jour `src/features/auth/services/auth.service.ts` :
```typescript
private async sendVerificationEmail(uidOrEmail: string): Promise<void> {
  const isUid = !uidOrEmail.includes('@');
  const functionUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTION_URL || 
    'https://us-central1-location-maison-dev.cloudfunctions.net/sendVerificationEmail';
  
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      isUid 
        ? { uid: uidOrEmail }
        : { email: uidOrEmail }
    ),
  });

  if (!response.ok) {
    throw new Error(`Failed to send verification email: ${response.statusText}`);
  }
}
```

2. Ajoutez la variable d'environnement dans `.env.local.*` :
```env
NEXT_PUBLIC_FIREBASE_FUNCTION_URL=https://us-central1-location-maison-dev.cloudfunctions.net/sendVerificationEmail
```
