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
├── documentation/          # Documentation complète du projet
│   ├── workflow/          # Workflow d'implémentation
│   ├── uml/               # Diagrammes UML
│   ├── feature/           # Documentation des features
│   ├── setup/             # Guides de configuration
│   ├── email/             # Documentation email
│   ├── phone/             # Documentation téléphone/SMS
│   ├── api/               # Documentation API
│   ├── config/            # Configuration
│   ├── seo/               # Documentation SEO
│   ├── migration/         # Migrations
│   └── troubleshooting/   # Dépannage
├── jenkins/               # Configuration Jenkins
├── scripts/vault/         # Scripts et configuration Vault  
├── functions/             # Firebase Functions
└── docker-compose.yml     # Configuration Docker
```

## 📚 Documentation

Toute la documentation du projet est organisée dans le dossier [`documentation/`](./documentation/).

### Documentation principale
- **[Workflow d'implémentation](./documentation/workflow/WORKFLOW.md)** : Processus complet de développement
- **[Diagrammes UML](./documentation/uml/README.md)** : Architecture et cas d'utilisation
- **[Annuaire des features](./documentation/feature/ANNUAIRE.md)** : Suivi des features

### Guides de configuration
- **[Setup](./documentation/setup/)** : Configuration des services (Airtel, Email, Firebase, etc.)
- **[Variables d'environnement](./documentation/config/ENV_VARIABLES.md)** : Configuration projet

### Dépannage
- **[Troubleshooting](./documentation/troubleshooting/)** : Guides de diagnostic
- **[Email](./documentation/email/)** : Problèmes d'email
- **[Téléphone](./documentation/phone/)** : Problèmes SMS/téléphone

Voir le [README principal de la documentation](./documentation/README.md) pour une vue d'ensemble complète.