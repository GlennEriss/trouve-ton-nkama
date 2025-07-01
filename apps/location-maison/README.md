# Location Maison - Plateforme de Location Immobilière

## 🚀 Démarrage du projet

Pour lancer le projet, consultez la section `scripts` dans le fichier `package.json`.

```bash
npm run dev
```

## 🔐 Configuration Vault

Pour lancer Vault, entrez dans le dossier vault et exécutez :

```bash
cd scripts/vault
vault server -config=vault.hcl
```

Vault sera accessible sur : `http://localhost:8200`

## 🏗️ Jenkins & CI/CD

### Démarrage de Jenkins
Pour lancer Jenkins avec Docker :

```bash
docker compose up --build
```

Jenkins sera accessible sur : `http://localhost:8090`

### Exposition publique avec ngrok

Pour rendre Jenkins accessible publiquement via Internet :

```bash
# Lancer ngrok avec URL auto-générée (plan gratuit)
ngrok http 8090
```

#### Processus complet
1. **Démarrer Jenkins** :
   ```bash
   docker compose up -d
   ```

2. **Attendre que Jenkins soit prêt** (vérifier sur http://localhost:8090)

3. **Lancer ngrok** :
   ```bash
   ngrok http 8090
   ```

4. **Récupérer l'URL publique** :
   - Interface ngrok : http://localhost:4040
   - L'URL publique sera affichée dans le terminal ngrok (ex: `https://abc123.ngrok.io`)

## 🔧 Prérequis

- Node.js 
- Docker & Docker Compose
- ngrok (installé sur la machine hôte)
- Vault (optionnel)

## 📁 Structure du projet

```
location-maison/
├── src/                    # Code source de l'application
├── jenkins/               # Configuration Jenkins
├── scripts/vault/         # Scripts et configuration Vault  
├── functions/             # Firebase Functions
└── docker-compose.yml     # Configuration Docker
```