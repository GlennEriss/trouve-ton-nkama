# Configuration d'Email - Trouve Ton Nkama

## Service d'envoi d'email : Nodemailer + Gmail OAuth2 📧

L'application utilise **Nodemailer** avec **Gmail OAuth2** pour l'envoi d'emails. Cette solution est **100% gratuite** et très fiable.

### Variables d'environnement requises

```bash
# Configuration Gmail OAuth2 pour l'envoi d'emails
GMAIL_SENDER_EMAIL=votre.email@gmail.com
GMAIL_OAUTH_CLIENT_ID=xxxxxxxxx.apps.googleusercontent.com
GMAIL_OAUTH_CLIENT_SECRET=GOCSPXxxxxxxxxxxxxxxxxxxxxx
GMAIL_OAUTH_REFRESH_TOKEN=1//0xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# URL de l'application
NEXT_PUBLIC_HOST=https://tonnkama.com
```

### Configuration Gmail OAuth2 (Étape par étape)

#### 1. **Activer l'API Gmail**
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un existant
3. Activer l'API Gmail : APIs & Services > Library > Gmail API > Enable

#### 2. **Créer les identifiants OAuth2**
1. APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID
2. Choisir **Web application**
3. Ajouter `https://developers.google.com/oauthplayground` dans les URI de redirection
4. Copier le **Client ID** et **Client Secret**

#### 3. **Configurer OAuth2 Playground**
1. Aller sur [OAuth2 Playground](https://developers.google.com/oauthplayground)
2. Cliquer sur l'icône ⚙️ (Settings) en haut à droite
3. Cocher **"Use your own OAuth credentials"**
4. Entrer votre **Client ID** et **Client Secret**
5. Dans la liste de gauche, sélectionner **Gmail API v1** > `https://www.googleapis.com/auth/gmail.send`
6. Cliquer **"Authorize APIs"**
7. Autoriser l'accès à votre compte Gmail
8. Cliquer **"Exchange authorization code for tokens"**
9. Copier le **Refresh Token**

### Fonctionnalités implémentées

- ✅ **Vérification d'email** : `/api/auth/send-verification-email`
- ✅ **Réinitialisation de mot de passe** : `/api/auth/send-password-reset-email`
- ✅ **Templates React Email** avec design responsive
- ✅ **Mode développement** : affiche les liens dans la console
- ✅ **Mode production** : envoi réel des emails via Gmail
- ✅ **Gestion automatique des tokens** : Refresh automatique
- ✅ **100% gratuit** : Aucun coût d'envoi

### Avantages de Gmail OAuth2

#### ✅ **Avantages :**
- **Gratuit** : Pas de limite d'emails (dans les limites raisonnables)
- **Fiable** : Utilise l'infrastructure Gmail
- **Délivrabilité** : Excellente réputation d'envoi
- **Sécurisé** : OAuth2 avec tokens d'actualisation
- **Domaine personnalisé** : Utilisez votre propre email

#### ⚠️ **Limitations :**
- **Quotas Gmail** : 500 emails/jour pour les comptes gratuits
- **Configuration** : Plus complexe que les services payants
- **Dépendance** : Liée à votre compte Google

### Alternatives disponibles

Si vous préférez utiliser un autre service :

#### 1. **Resend** (simple et moderne)
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 2. **SendGrid** (entreprise)
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
```

#### 3. **Firebase Cloud Functions** (exemple disponible)
URL : `https://us-central1-paramedical-1027c.cloudfunctions.net/triggerSendEmails`

### Test en développement

En mode développement, les emails ne sont pas envoyés, mais les liens sont affichés dans la console :

```bash
npm run dev
# 📧 Email simulé avec Gmail: { from: ..., to: ..., subject: ..., debugLink: ... }
```

### Sécurité

- **OAuth2** : Authentification sécurisée avec Google
- **Tokens** : Refresh automatique des access tokens
- **Validation** : Vérification de la configuration au démarrage
- **Chiffrement** : TLS/SSL pour tous les envois

### Dépannage

1. **Vérifiez vos credentials** : Google Cloud Console > Credentials
2. **Vérifiez l'API Gmail** : Doit être activée dans votre projet
3. **Vérifiez le refresh token** : Utilisez OAuth2 Playground
4. **Consultez les logs** : `console.log` en développement
5. **Testez les templates** : `npm run email`

### Erreurs communes

#### ❌ **"invalid_grant"**
- Le refresh token a expiré
- Régénérez-le via OAuth2 Playground

#### ❌ **"insufficient_scope"**
- Scope Gmail manquant
- Ajoutez `https://www.googleapis.com/auth/gmail.send`

#### ❌ **"API not enabled"**
- Activez l'API Gmail dans Google Cloud Console

#### ❌ **"invalid_client"**
- Client ID ou Secret incorrect
- Vérifiez vos credentials OAuth2

### Quota Gmail

- **Comptes gratuits** : 500 emails/jour
- **Google Workspace** : 2000 emails/jour
- **Limite par minute** : 250 messages

Pour des besoins plus importants, considérez Google Workspace ou un service dédié comme Resend/SendGrid. 