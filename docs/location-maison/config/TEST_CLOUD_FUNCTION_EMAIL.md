# Tester la Cloud Function d'Envoi d'Email

## 📧 Situation Actuelle

- **Route API Next.js** : `/api/auth/send-verification-email` ✅ **Fonctionne**
- **Cloud Function** : `sendVerificationEmail` ⏳ **Pas encore déployée** (quota Firebase)

## 🔄 Pour Basculer vers la Cloud Function

Une fois la Cloud Function déployée, modifier `src/features/auth/services/auth.service.ts` :

### Avant (Route API Next.js)
```typescript
private async sendVerificationEmail(uidOrEmail: string): Promise<void> {
  const response = await fetch('/api/auth/send-verification-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: uidOrEmail }),
  });
}
```

### Après (Cloud Function)
```typescript
private async sendVerificationEmail(uidOrEmail: string): Promise<void> {
  const functionUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTION_URL || 
    'https://us-central1-location-maison-dev.cloudfunctions.net/sendVerificationEmail';
  
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: uidOrEmail }),
  });
}
```

## 🚀 Déploiement de la Cloud Function

1. **Attendre que le quota Firebase soit réinitialisé** (quelques minutes)

2. **Configurer les secrets Firebase** :
```bash
firebase functions:secrets:set HOSTINGER_EMAIL_USER
firebase functions:secrets:set HOSTINGER_EMAIL_PASS
firebase functions:secrets:set EMAIL_DISPLAY_NAME
firebase functions:secrets:set NEXT_PUBLIC_APP_URL
```

3. **Déployer** :
```bash
firebase deploy --only functions:sendVerificationEmail
```

## ✅ Test de l'Envoi d'Email

Le test E2E `create-user-demo.spec.ts` crée un utilisateur avec `hetiwoh254@feanzier.com`.

Pour vérifier si l'email est envoyé :
1. Vérifier les logs du serveur Next.js (route API actuelle)
2. Vérifier les logs Firebase Functions (une fois déployée)
3. Vérifier la boîte mail `hetiwoh254@feanzier.com`

## 📝 Variables d'Environnement Requises

### Pour la Route API Next.js (actuelle)
- `HOSTINGER_EMAIL_USER`
- `HOSTINGER_EMAIL_PASS`
- `EMAIL_DISPLAY_NAME`
- `FORCE_REAL_EMAILS=true` (en dev pour envoyer de vrais emails)

### Pour la Cloud Function (une fois déployée)
- Secrets Firebase configurés via `firebase functions:secrets:set`
