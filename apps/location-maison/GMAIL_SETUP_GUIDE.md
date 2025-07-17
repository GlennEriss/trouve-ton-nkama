# 🚀 Guide de Configuration Gmail OAuth2 - Démarrage Rapide

## 📋 Prérequis

- Un compte Gmail
- Accès à Google Cloud Console
- 15 minutes de configuration

## ⚡ Configuration Rapide (5 étapes)

### 1. **Google Cloud Console**
```bash
# Aller sur https://console.cloud.google.com/
# Créer un projet ou sélectionner un existant
# Activer l'API Gmail : APIs & Services > Library > Gmail API > Enable
```

### 2. **Créer les Credentials OAuth2**
```bash
# APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID
# Type: Web application
# Authorized redirect URIs: https://developers.google.com/oauthplayground
# Copier Client ID et Client Secret
```

### 3. **OAuth2 Playground**
```bash
# Aller sur https://developers.google.com/oauthplayground
# Settings (⚙️) > Use your own OAuth credentials = TRUE
# Entrer Client ID et Client Secret
# Scope: https://www.googleapis.com/auth/gmail.send
# Authorize APIs > Exchange authorization code for tokens
# Copier le Refresh Token
```

### 4. **Variables d'Environnement**
```bash
# Créer/modifier votre .env.local
GMAIL_SENDER_EMAIL=votre.email@gmail.com
GMAIL_OAUTH_CLIENT_ID=xxxxxxxxx.apps.googleusercontent.com
GMAIL_OAUTH_CLIENT_SECRET=GOCSPXxxxxxxxxxxxxxxxxxxxxx
GMAIL_OAUTH_REFRESH_TOKEN=1//0xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_HOST=http://localhost:3000
```

### 5. **Tester la Configuration**
```bash
# Test basique
npm run test:gmail

# Test avec envoi d'email
npm run test:gmail:send
```

## 🎯 Résultat Attendu

Après configuration, vous devriez voir :
```bash
✅ GMAIL_SENDER_EMAIL: votre.email@gmail.com
✅ GMAIL_OAUTH_CLIENT_ID: xxxxxxxxx.apps.googleus...
✅ GMAIL_OAUTH_CLIENT_SECRET: GOCSPXxxxxxxxxxxxxxxxxxxxxx
✅ GMAIL_OAUTH_REFRESH_TOKEN: 1//0xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

🔑 Test de génération d'access token...
✅ Access token généré avec succès
🔑 Token: ya29.a0AfH6SMBGxxxxx...

📧 Test de création du transporteur Nodemailer...
🔌 Test de connexion au serveur Gmail...
✅ Connexion Gmail établie avec succès!

🎉 Configuration Gmail OAuth2 entièrement fonctionnelle!
```

## 🔧 Scripts Utiles

```bash
# Tester la configuration
npm run test:gmail

# Envoyer un email de test
npm run test:gmail:send

# Développement (emails simulés)
npm run dev

# Prévisualiser les templates
npm run email
```

## 🚨 Dépannage Rapide

### **Erreur: "invalid_grant"**
```bash
# Solution: Régénérer le refresh token
# 1. OAuth2 Playground > Revoke token
# 2. Recommencer l'étape 3
```

### **Erreur: "API not enabled"**
```bash
# Solution: Activer l'API Gmail
# Google Cloud Console > APIs & Services > Library > Gmail API > Enable
```

### **Erreur: "insufficient_scope"**
```bash
# Solution: Vérifier le scope
# Scope requis: https://www.googleapis.com/auth/gmail.send
```

### **Erreur: "invalid_client"**
```bash
# Solution: Vérifier les credentials
# 1. Client ID et Secret corrects
# 2. Redirect URI: https://developers.google.com/oauthplayground
```

## 📊 Quotas Gmail

- **Comptes Gmail gratuits** : 500 emails/jour
- **Google Workspace** : 2000 emails/jour
- **Limite par minute** : 250 messages

## 🎉 Validation Finale

Une fois configuré, testez vos APIs :

```bash
# Test de vérification d'email
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test de réinitialisation mot de passe
curl -X POST http://localhost:3000/api/auth/send-password-reset-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🔗 Liens Utiles

- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth2 Playground](https://developers.google.com/oauthplayground)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Documentation complète](./EMAIL_SETUP.md)

---

**💡 Astuce** : Gardez vos credentials OAuth2 en sécurité et ne les commitez jamais dans Git ! 