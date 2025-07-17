# Configuration Hostinger SMTP pour Trouve Ton Nkama

## 📧 Configuration des variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Hostinger SMTP Configuration
HOSTINGER_EMAIL_USER=ton.email@tondomaine.com
HOSTINGER_EMAIL_PASS=tonMotDePasse

# Configuration d'affichage (optionnel)
EMAIL_DISPLAY_NAME=Trouve Ton Nkama
```

## 🔧 Paramètres SMTP Hostinger

- **Serveur SMTP** : `smtp.hostinger.com`
- **Port** : `465`
- **Sécurité** : `SSL/TLS`
- **Authentification** : `Oui`

## 🧪 Test de la configuration

### 1. Test de base
```bash
node scripts/test-hostinger-config.js
```

### 2. Test avec envoi d'email
Ajoutez dans votre `.env` :
```env
TEST_EMAIL=votre.email@example.com
```

Puis relancez le test :
```bash
node scripts/test-hostinger-config.js
```

## ✅ Vérification

Le script de test vérifiera :
- ✅ Variables d'environnement présentes
- ✅ Connexion au serveur SMTP
- ✅ Authentification réussie
- ✅ Envoi d'email de test (si TEST_EMAIL configuré)

## 🚨 Dépannage

### Erreur d'authentification
- Vérifiez vos identifiants Hostinger
- Assurez-vous que l'email est activé sur votre compte Hostinger

### Erreur de connexion
- Vérifiez votre connexion internet
- Vérifiez que le port 465 n'est pas bloqué

### Email non reçu
- Vérifiez vos spams
- Vérifiez que l'adresse de test est valide

## 🔄 Migration depuis Gmail

Si vous migrez depuis Gmail OAuth2, vous pouvez supprimer ces variables :
- `GMAIL_SENDER_EMAIL`
- `GMAIL_OAUTH_CLIENT_ID`
- `GMAIL_OAUTH_CLIENT_SECRET`
- `GMAIL_OAUTH_REFRESH_TOKEN`

## 📝 Notes importantes

1. **Sécurité** : Gardez vos identifiants Hostinger secrets
2. **Limites** : Vérifiez les limites d'envoi de votre plan Hostinger
3. **Monitoring** : Surveillez les logs d'envoi d'emails
4. **Backup** : Gardez une copie de l'ancienne configuration Gmail au cas où

## 🎯 Avantages Hostinger SMTP

- ✅ Configuration simple
- ✅ Pas de configuration OAuth2 complexe
- ✅ Intégration native avec votre hébergement
- ✅ Support technique inclus
- ✅ Limites d'envoi généreuses 