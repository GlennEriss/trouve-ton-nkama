# Debug : Secrets Cloud Function

## 🔍 Problème Identifié

La Cloud Function utilise `process.env` pour accéder aux secrets, mais dans Firebase Functions v1, les secrets configurés via `firebase functions:secrets:set` ne sont **pas automatiquement** disponibles via `process.env`.

## ✅ Solution Implémentée

La Cloud Function charge maintenant les secrets depuis **Secret Manager** via l'API `@google-cloud/secret-manager`.

### Fonction `loadSecrets()`

```typescript
async function loadSecrets(): Promise<{ [key: string]: string }> {
  // 1. Vérifier le cache
  if (secretsCache) return secretsCache;
  
  // 2. Essayer process.env d'abord (pour tests locaux)
  // 3. Sinon, charger depuis Secret Manager
  const client = new SecretManagerServiceClient();
  // ...
}
```

## 🔐 Secrets Configurés

- ✅ `HOSTINGER_EMAIL_USER` = `contact@tonnkama.com`
- ✅ `HOSTINGER_EMAIL_PASS` = `RolyRitchi2025@tonnkama`
- ✅ `EMAIL_DISPLAY_NAME` = `Trouve Ton Nkama`
- ✅ `NEXT_PUBLIC_APP_URL` = `http://localhost:3000`

## 🧪 Test de la Cloud Function

```bash
# Tester avec un email existant
curl -X POST https://us-central1-location-maison-dev.cloudfunctions.net/sendVerificationEmail \
  -H "Content-Type: application/json" \
  -d '{"email":"hetiwoh254@feanzier.com"}'
```

## 📋 Vérification des Logs

```bash
# Voir les logs de la Cloud Function
firebase functions:log --only sendVerificationEmail

# Voir les logs en temps réel
firebase functions:log --only sendVerificationEmail --follow
```

## ⚠️ Permissions Requises

Le service account de la Cloud Function doit avoir la permission `secretmanager.secrets.accessSecretVersion` pour accéder aux secrets.

Par défaut, le service account `{project-id}@appspot.gserviceaccount.com` devrait avoir ces permissions, mais si ça ne fonctionne pas, vérifier dans Google Cloud Console > IAM.

## 🔄 Prochaines Étapes

1. ✅ Cloud Function redéployée avec chargement des secrets
2. ⏳ Test E2E en cours pour créer l'utilisateur
3. ⏳ Vérifier si l'email est envoyé après création de l'utilisateur
