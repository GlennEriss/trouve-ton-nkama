# Diagnostic : Envoi d'Email de Vérification

## 🔍 Analyse

### Comment l'email était envoyé dans l'ancien composant

L'ancien composant (`src/components/signup/Signup.tsx`) utilisait :
```typescript
// Envoyer l'email de vérification en arrière-plan (non-bloquant)
fetch('/api/auth/send-verification-email', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        email: user.login!,
    }),
})
```

### Comment l'email est envoyé dans le nouveau composant

Le nouveau composant (`src/features/auth/services/auth.service.ts`) utilise :
```typescript
// 8. Send verification email (non-blocking, in background)
this.sendVerificationEmail(uid).catch((error) => {
    console.warn('Failed to send verification email:', error);
});

private async sendVerificationEmail(uidOrEmail: string): Promise<void> {
    const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: uidOrEmail }),
    });
}
```

**Conclusion** : Les deux utilisent la **même route API Next.js** (`/api/auth/send-verification-email`), pas une cloud function.

## 📧 Service d'Email

Le service d'email utilise **Hostinger SMTP** via Nodemailer (pas Gmail OAuth2).

### Configuration requise

```env
HOSTINGER_EMAIL_USER=ton.email@tondomaine.com
HOSTINGER_EMAIL_PASS=tonMotDePasse
EMAIL_DISPLAY_NAME=Trouve Ton Nkama
FORCE_REAL_EMAILS=true  # Pour envoyer de vrais emails en dev
```

### Comportement en développement

En développement, si `FORCE_REAL_EMAILS=false` :
- Les emails sont **simulés** (juste un log console)
- Aucun email réel n'est envoyé
- Le lien de vérification est affiché dans les logs

## 🚨 Problème identifié

1. **Variables Hostinger manquantes** : `HOSTINGER_EMAIL_USER` et `HOSTINGER_EMAIL_PASS` ne sont pas configurées en dev
2. **FORCE_REAL_EMAILS=false** : Les emails sont simulés en dev
3. **Pas de cloud function** : L'envoi d'email se fait via une route API Next.js, pas une cloud function

## ✅ Solutions

### Option 1 : Activer l'envoi réel d'emails en dev

1. Ajouter les variables Hostinger dans `.env.local.dev` :
```env
HOSTINGER_EMAIL_USER=ton.email@tondomaine.com
HOSTINGER_EMAIL_PASS=tonMotDePasse
FORCE_REAL_EMAILS=true
```

2. Redémarrer le serveur Next.js

### Option 2 : Vérifier les logs du serveur

Les emails simulés affichent le lien de vérification dans les logs :
```
📧 Email simulé avec Hostinger SMTP: {
  from: ...,
  to: ...,
  subject: ...,
  debugLink: 'http://localhost:3000/api/auth/verify-email?uid=...'
}
```

### Option 3 : Utiliser la production

En production (`NODE_ENV=production`), les emails sont automatiquement envoyés si les variables Hostinger sont configurées.

## 🔧 Pas de Cloud Function nécessaire

Il n'y a **pas besoin de déployer une cloud function** car :
- L'ancien composant utilisait aussi la route API Next.js
- Le nouveau composant utilise la même route API
- Le service d'email est déjà implémenté dans `src/services/email.service.ts`

## 📝 Prochaines étapes

1. Vérifier que les variables Hostinger sont configurées en production
2. Activer `FORCE_REAL_EMAILS=true` en dev pour tester
3. Vérifier les logs du serveur pour voir si l'email est bien appelé
