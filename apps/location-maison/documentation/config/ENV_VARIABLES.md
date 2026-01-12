# 📋 Variables d'Environnement - Gmail OAuth2

## 🎯 **Nouvelles Variables (Spécifiques à l'Envoi d'Emails)**

### Variables Gmail OAuth2 pour l'envoi d'emails :

```bash
# Adresse email Gmail qui enverra les emails de l'application
GMAIL_SENDER_EMAIL=votre.email@gmail.com

# Client ID OAuth2 créé spécifiquement pour l'envoi d'emails
GMAIL_OAUTH_CLIENT_ID=xxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# Client Secret OAuth2 créé spécifiquement pour l'envoi d'emails  
GMAIL_OAUTH_CLIENT_SECRET=GOCSPXxxxxxxxxxxxxxxxxxxxxx

# Refresh Token OAuth2 généré pour l'envoi d'emails
GMAIL_OAUTH_REFRESH_TOKEN=1//0xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# URL de base de l'application
NEXT_PUBLIC_HOST=http://localhost:3000

# Force l'envoi réel d'emails en développement (optionnel)
FORCE_REAL_EMAILS=false
```

## 🔄 **Migration depuis les anciennes variables**

Si vous aviez les anciennes variables :

```bash
# ❌ ANCIENNES VARIABLES (ne plus utiliser)
GOOGLE_EMAIL=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# ✅ NOUVELLES VARIABLES (utiliser maintenant)
GMAIL_SENDER_EMAIL=...
GMAIL_OAUTH_CLIENT_ID=...
GMAIL_OAUTH_CLIENT_SECRET=...
GMAIL_OAUTH_REFRESH_TOKEN=...
```

## 📝 **Pourquoi ce changement ?**

### **Clarté et Organisation :**
- ✅ **Plus explicite** : `GMAIL_OAUTH_CLIENT_ID` vs `GOOGLE_CLIENT_ID`
- ✅ **Usage clair** : Ces variables sont **spécifiquement** pour l'envoi d'emails
- ✅ **Séparation** : Distinguer l'OAuth2 pour emails des autres services Google
- ✅ **Évolutivité** : Possibilité d'ajouter d'autres services Google plus tard

### **Exemple d'usage multiple :**
```bash
# OAuth2 pour l'envoi d'emails
GMAIL_OAUTH_CLIENT_ID=...
GMAIL_OAUTH_CLIENT_SECRET=...

# OAuth2 pour Google Drive (futur)
GDRIVE_OAUTH_CLIENT_ID=...
GDRIVE_OAUTH_CLIENT_SECRET=...

# OAuth2 pour Google Calendar (futur)
GCALENDAR_OAUTH_CLIENT_ID=...
GCALENDAR_OAUTH_CLIENT_SECRET=...
```

## 🚀 **Configuration du nouveau Client OAuth2**

### 1. **Créer un nouveau client OAuth2 "Email Service"**
```bash
🌐 Google Cloud Console > APIs & Services > Credentials
📝 Name: "Trouve Ton Nkama - Email Service"
🎯 Purpose: Envoi d'emails uniquement
```

### 2. **Configuration spécifique :**
```bash
✅ Application type: Web application
✅ Name: Trouve Ton Nkama - Email Service
✅ Authorized redirect URIs: https://developers.google.com/oauthplayground
✅ Scopes: https://www.googleapis.com/auth/gmail.send
```

### 3. **Avantages d'un client dédié :**
- 🔒 **Sécurité** : Permissions limitées à l'envoi d'emails
- 📊 **Monitoring** : Quotas et analytics séparés
- 🚫 **Révocation** : Possibilité de désactiver sans affecter autres services
- 🔧 **Maintenance** : Plus facile à gérer et debugger

## 🧪 **Test de la nouvelle configuration**

```bash
# Ajouter les nouvelles variables dans .env.local
GMAIL_SENDER_EMAIL=votre.email@gmail.com
GMAIL_OAUTH_CLIENT_ID=votre-nouveau-client-id
GMAIL_OAUTH_CLIENT_SECRET=votre-nouveau-client-secret
GMAIL_OAUTH_REFRESH_TOKEN=votre-nouveau-refresh-token

# Tester la configuration
npm run test:gmail

# Envoyer un email de test
npm run test:gmail:send
```

## 📚 **Documentation associée**

- **Configuration complète** : `EMAIL_SETUP.md`
- **Guide rapide** : `GMAIL_SETUP_GUIDE.md`
- **Service email** : `src/services/email.service.ts`
- **Script de test** : `scripts/test-gmail-config.js`

## 🔗 **Structure finale des variables**

```bash
# ===========================================
# GMAIL OAUTH2 - ENVOI D'EMAILS
# ===========================================
GMAIL_SENDER_EMAIL=contact@tonnkama.com
GMAIL_OAUTH_CLIENT_ID=123456789-abc123.apps.googleusercontent.com  
GMAIL_OAUTH_CLIENT_SECRET=GOCSPX-abc123def456
GMAIL_OAUTH_REFRESH_TOKEN=1//0abc123def456

# ===========================================  
# APPLICATION
# ===========================================
NEXT_PUBLIC_HOST=https://tonnkama.com

# ===========================================
# FIREBASE (si utilisé)
# ===========================================
FIREBASE_PROJECT_ID=trouve-ton-nkama
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@trouve-ton-nkama.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbc123def456

# ===========================================
# DÉVELOPPEMENT (optionnel)
# ===========================================
TEST_EMAIL=test@example.com
```

---

**💡 Cette nouvelle structure vous permet d'avoir une configuration Gmail OAuth2 claire, sécurisée et spécifiquement dédiée à l'envoi d'emails !** 