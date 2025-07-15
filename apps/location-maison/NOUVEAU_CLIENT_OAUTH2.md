# 🚀 Guide : Créer un Client OAuth2 Dédié pour l'Envoi d'Emails

## 🎯 **Objectif**
Créer un **nouveau client OAuth2** spécifiquement pour l'envoi d'emails avec des variables d'environnement **claires et explicites**.

## ⚡ **Étapes Rapides (10 minutes)**

### **Étape 1 : Google Cloud Console**
```bash
🌐 Aller sur : https://console.cloud.google.com/
📂 Sélectionner votre projet
🔍 Navigation : APIs & Services > Credentials
```

### **Étape 2 : Créer le Nouveau Client**
```bash
📝 Cliquer : "+ CREATE CREDENTIALS" > "OAuth 2.0 Client ID"
🏷️ Application type : "Web application"
📝 Name : "Trouve Ton Nkama - Email Service"
```

### **Étape 3 : Configuration URI**
```bash
🔗 Authorized redirect URIs :
   + ADD URI : https://developers.google.com/oauthplayground
💾 Cliquer : "CREATE"
```

### **Étape 4 : Sauvegarder les Credentials**
```bash
📋 Copier et sauvegarder :
✅ Client ID : xxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
✅ Client Secret : GOCSPXxxxxxxxxxxxxxxxxxxxxx
```

### **Étape 5 : OAuth2 Playground**
```bash
🌐 Aller sur : https://developers.google.com/oauthplayground
⚙️ Settings > "Use your own OAuth credentials" = TRUE
📝 Entrer votre Client ID et Client Secret
📧 Scope : https://www.googleapis.com/auth/gmail.send
🔐 Authorize APIs > Autoriser l'accès
🔄 Exchange authorization code for tokens
📋 Copier le Refresh Token
```

### **Étape 6 : Variables d'Environnement**
```bash
# Ajouter dans .env.local
GMAIL_SENDER_EMAIL=votre.email@gmail.com
GMAIL_OAUTH_CLIENT_ID=votre-nouveau-client-id
GMAIL_OAUTH_CLIENT_SECRET=votre-nouveau-client-secret
GMAIL_OAUTH_REFRESH_TOKEN=votre-nouveau-refresh-token
NEXT_PUBLIC_HOST=http://localhost:3000
```

### **Étape 7 : Test**
```bash
# Tester la configuration
npm run test:gmail

# Si tout fonctionne :
npm run test:gmail:send
```

## ✅ **Résultat Attendu**

```bash
🔍 Vérification de la configuration Gmail OAuth2...

📋 Variables d'environnement:
✅ GMAIL_SENDER_EMAIL: votre.email@gmail.com
✅ GMAIL_OAUTH_CLIENT_ID: xxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxx...
✅ GMAIL_OAUTH_CLIENT_SECRET: GOCSPXxxxxxxxxxxxxxxxxxxxxx
✅ GMAIL_OAUTH_REFRESH_TOKEN: 1//0xxxxxxxxxxxxxxxxxxxxxxxxxxxxx...

🔑 Test de génération d'access token...
✅ Access token généré avec succès
🔑 Token: ya29.a0AfH6SMBGxxxxx...

📧 Test de création du transporteur Nodemailer...
🔌 Test de connexion au serveur Gmail...
✅ Connexion Gmail établie avec succès!

🎉 Configuration Gmail OAuth2 entièrement fonctionnelle!
```

## 🔒 **Avantages du Client Dédié**

### **Sécurité :**
- ✅ **Permissions limitées** : Seul l'envoi d'emails est autorisé
- ✅ **Isolation** : Pas d'impact sur d'autres services Google
- ✅ **Révocation facile** : Désactiver sans affecter le reste

### **Organisation :**
- ✅ **Variables explicites** : `GMAIL_OAUTH_CLIENT_ID` vs `GOOGLE_CLIENT_ID`
- ✅ **Usage clair** : Pas de confusion sur l'utilisation
- ✅ **Évolutivité** : Facile d'ajouter d'autres services Google

### **Monitoring :**
- ✅ **Quotas séparés** : 500 emails/jour spécifiquement pour votre app
- ✅ **Analytics** : Statistiques d'usage dédiées
- ✅ **Debug** : Plus facile à diagnostiquer

## 🚨 **Erreurs Communes et Solutions**

### ❌ **"redirect_uri_mismatch"**
```bash
💡 Solution : Vérifier l'URI de redirection
✅ Doit être exactement : https://developers.google.com/oauthplayground
```

### ❌ **"invalid_client"**
```bash
💡 Solution : Vérifier Client ID et Secret
✅ Pas d'espaces en trop
✅ Copier-coller complet
```

### ❌ **"insufficient_scope"**
```bash
💡 Solution : Vérifier le scope Gmail
✅ Doit être : https://www.googleapis.com/auth/gmail.send
```

### ❌ **"API not enabled"**
```bash
💡 Solution : Activer l'API Gmail
✅ Google Cloud Console > APIs & Services > Library > Gmail API > Enable
```

## 📋 **Checklist Finale**

- [ ] ✅ Nouveau client OAuth2 créé
- [ ] ✅ URI de redirection configurée  
- [ ] ✅ API Gmail activée
- [ ] ✅ Scope `gmail.send` autorisé
- [ ] ✅ Variables d'environnement mises à jour
- [ ] ✅ Test de configuration réussi
- [ ] ✅ Test d'envoi d'email réussi

## 🎉 **Prêt !**

Votre système d'envoi d'emails est maintenant configuré avec :
- 🔐 **Client OAuth2 dédié** à l'envoi d'emails
- 📝 **Variables explicites** et bien organisées  
- ✅ **Configuration sécurisée** et maintenable
- 🆓 **100% gratuit** (500 emails/jour)

**Prochaine étape :** Testez vos APIs de vérification d'email et reset de mot de passe ! 🚀 