# Documentation des Routes API d'Authentification

Cette documentation décrit les routes API d'authentification pour le système de vérification d'email et de réinitialisation de mot de passe.

## Routes Disponibles

### 1. POST /api/auth/send-verification-email
Envoie un email de vérification à l'utilisateur.

**Request Body:**
```json
{
  "email": "user@example.com",
  "subject": "Vérifiez votre adresse email - Trouve Ton Nkama",
  "texts": {
    "title": "Vérifiez votre adresse email",
    "greeting": "Bonjour",
    "mainText": "Merci de vous être inscrit...",
    "buttonText": "Vérifier mon email"
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Email de vérification envoyé avec succès",
  "verificationLink": "https://tonnkama.com/api/auth/verify-email?uid=..."
}
```

**Response Error (404):**
```json
{
  "error": "Aucun compte associé à cette adresse email"
}
```

### 2. GET /api/auth/verify-email?uid=USER_UID
Vérifie l'email d'un utilisateur et redirige vers la page appropriée.

**Query Parameters:**
- `uid`: L'identifiant unique de l'utilisateur

**Redirections:**
- `/email-already-verified` si l'email est déjà vérifié
- `/email-verification-success` si la vérification réussit
- Erreur 404 si l'utilisateur n'existe pas

### 3. POST /api/auth/verify-email
Vérifie l'email d'un utilisateur via API (retourne JSON).

**Request Body:**
```json
{
  "uid": "user_uid_here"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Email vérifié avec succès",
  "alreadyVerified": false
}
```

### 4. POST /api/auth/send-password-reset-email
Envoie un email de réinitialisation de mot de passe.

**Request Body:**
```json
{
  "email": "user@example.com",
  "subject": "Réinitialisez votre mot de passe - Trouve Ton Nkama",
  "texts": {
    "title": "Réinitialisez votre mot de passe",
    "greeting": "Bonjour",
    "mainText": "Vous avez demandé la réinitialisation...",
    "buttonText": "Réinitialiser mon mot de passe"
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Email de réinitialisation envoyé avec succès",
  "resetLink": "https://tonnkama.com/api/auth/password-reset?oobCode=..."
}
```

### 5. GET /api/auth/password-reset?oobCode=OOB_CODE
Valide le token de réinitialisation et redirige vers la page de réinitialisation.

**Query Parameters:**
- `oobCode`: Le code OOB généré par Firebase

**Redirections:**
- `/password-reset?oobCode=...` si le code est valide
- `/password-reset-failure` si le code est invalide ou expiré

### 6. POST /api/auth/password-reset
Confirme la réinitialisation du mot de passe avec le nouveau mot de passe.

**Request Body:**
```json
{
  "newPassword": "nouveauMotDePasse123",
  "oobCode": "oob_code_from_email"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès"
}
```

**Response Error (400):**
```json
{
  "error": "Le lien de réinitialisation a expiré"
}
```

## Actions Server disponibles

### sendVerificationEmail(email: string)
Action server pour envoyer un email de vérification.

```typescript
import { sendVerificationEmail } from '@/actions/send-verification-email'

const result = await sendVerificationEmail('user@example.com')
if (result.success) {
  // Email envoyé avec succès
} else {
  // Erreur: result.error
}
```

### sendPasswordResetEmail(email: string)
Action server pour envoyer un email de réinitialisation.

```typescript
import { sendPasswordResetEmail } from '@/actions/send-verification-email'

const result = await sendPasswordResetEmail('user@example.com')
if (result.success) {
  // Email envoyé avec succès
} else {
  // Erreur: result.error
}
```

## Utilisation dans les Composants

### Composant PasswordResetRequest
```typescript
const onSubmit = async (values: PasswordResetForm) => {
  const response = await fetch('/api/auth/send-password-reset-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: values.email })
  })
  
  const data = await response.json()
  // Traitement de la réponse
}
```

### Composant PasswordReset
```typescript
const onSubmit = async (values: PasswordResetForm) => {
  const response = await fetch('/api/auth/password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      newPassword: values.password,
      oobCode: token
    })
  })
  
  const data = await response.json()
  // Traitement de la réponse
}
```

## Pages de Redirection

Les routes API redirigent automatiquement vers ces pages :

- `/email-already-verified` - Email déjà vérifié
- `/email-verification-success` - Vérification réussie
- `/password-reset` - Formulaire de nouveau mot de passe
- `/password-reset-failure` - Échec de la réinitialisation

## Variables d'Environnement Requises

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_HOST=https://tonnkama.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
GOOGLE_EMAIL=your_smtp_email
```

## Sécurité

- Tous les tokens OOB ont une durée de validité limitée (1 heure)
- La vérification d'email est sécurisée via Firebase Admin
- Les erreurs sont gérées et loggées côté serveur
- Les tokens invalides ou expirés redirigent vers les pages d'erreur appropriées

## Notes Importantes

1. **Envoi d'emails** : Les routes génèrent actuellement les emails HTML mais l'envoi réel doit être implémenté avec un service comme Nodemailer, SendGrid, etc.

2. **Tests** : Les routes retournent les liens de vérification/réinitialisation pour faciliter les tests en développement.

3. **Gestion d'erreurs** : Toutes les routes incluent une gestion d'erreurs complète avec des messages en français.

4. **Intégration Firebase** : Les routes utilisent Firebase Admin SDK pour la gestion des utilisateurs et la génération des tokens. 