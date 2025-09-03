# 🚀 Commandes Firebase Property Uploader

## 📋 Configuration initiale

```bash
# 1. Créer les fichiers de configuration
cp env.dev.example .env.dev
cp env.prod.example .env.prod

# 2. Éditer les fichiers avec vos vraies clés Firebase
nano .env.dev    # ou votre éditeur préféré
nano .env.prod

# 3. Installer les dépendances
npm install
```

## 🎯 Commandes principales

```bash
# 🟡 DÉVELOPPEMENT - Déploiement intelligent
npm run dev

# 🔴 PRODUCTION - Déploiement intelligent avec URLs dynamiques
npm run prod
```

**🧠 Logique intelligente :**
- Si aucune donnée → Upload complet avec nouvelles URLs
- Si données existantes → Synchronisation cross-environnement

## 🔍 Commandes de vérification

```bash
# Vérifier l'environnement actuel
npm run check

# Tester la connexion Firebase (sans uploader)
npm run test:connection

# Tester le traitement des contacts
npm test
```

## 🛠️ Commandes techniques

```bash
# Copier uniquement l'environnement dev
npm run copy:env:dev

# Copier uniquement l'environnement prod  
npm run copy:env:prod

# Lancer l'upload avec l'environnement actuel
npm run upload

# Lancer avec l'environnement par défaut
npm start
```

## 📊 Workflow typique

1. **Configuration** (une seule fois)
   ```bash
   cp env.dev.example .env.dev
   cp env.prod.example .env.prod
   # Éditer les fichiers avec vos clés
   npm install
   ```

2. **Test en développement**
   ```bash
   npm run dev
   ```

3. **Déploiement en production**
   ```bash
   npm run prod
   ```

4. **Vérification**
   ```bash
   npm run check
   ```

## ⚠️ Sécurité

- ✅ Les fichiers `.env*` sont dans le `.gitignore`
- ✅ Le script affiche clairement l'environnement utilisé
- ✅ Confirmation requise pour la production
- ✅ Chaque environnement a sa propre base de données 