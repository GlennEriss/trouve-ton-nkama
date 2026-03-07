# Diagrammes UML - Plateforme Location Maison Gabon

Ce dossier contient les diagrammes UML décrivant l'architecture fonctionnelle de la plateforme de location et vente immobilière au Gabon.

## 📁 Structure des fichiers

```
uml/
├── README.md                      # Ce fichier
├── ANALYSE_PROBLEMES.md           # Analyse des problèmes du projet
├── PLAN_RESTRUCTURATION.md        # Plan de restructuration complet
├── context-diagram.puml           # Diagramme de contexte (v2.1)
├── class-diagram.puml             # Diagramme de classes (v2.1 - Anglais)
├── use-cases-visiteur.puml        # Cas d'utilisation - Visiteur
├── use-cases-utilisateur.puml     # Cas d'utilisation - Utilisateur (v2.1)
├── use-cases-recherche.puml       # 🆕 Cas d'utilisation - Recherche (tous utilisateurs)
├── use-cases-annonceur.puml       # Cas d'utilisation - Annonceur (v2.1)
├── use-cases-credits.puml         # Cas d'utilisation - Système de Crédits
└── use-cases-administrateur.puml  # Cas d'utilisation - Administrateur
```

## 🆕 Nouveautés v2.0

### Plan de Restructuration
Un document complet de restructuration a été créé : **[PLAN_RESTRUCTURATION.md](./PLAN_RESTRUCTURATION.md)**

Ce document inclut :
- ✅ Analyse de l'état actuel
- ✅ Convention de nommage (tout en anglais)
- ✅ Architecture des tests (unitaires, intégration, E2E)
- ✅ Système de crédits repensé
- ✅ GitHub Actions amélioré
- ✅ Roadmap de migration

### Diagramme de Classes v2.0
Le diagramme de classes a été complètement refactorisé :
- Convention anglaise unique
- Correction des typos (`nbrChickens` → `numberOfKitchens`)
- Système de crédits restructuré (`CreditWallet`, `CreditPurchase`, `CreditExpense`)
- Énumérations en SCREAMING_CASE

### Use Case Crédits
Un nouveau diagramme dédié au système de crédits : **[use-cases-credits.puml](./use-cases-credits.puml)**

---

## 🎭 Acteurs identifiés

### Acteurs Primaires (utilisateurs directs)

| Acteur | Description | Rôle Firebase |
|--------|-------------|---------------|
| **Visiteur** | Utilisateur non authentifié qui navigue sur la plateforme | Non authentifié |
| **Utilisateur (Membre)** | Utilisateur authentifié, peut rechercher et ajouter aux favoris | `roles: []` |
| **Annonceur** | Utilisateur qui publie des annonces (propriétaire, agence, démarcheur) | `roles: ["Announcer"]` |
| **Administrateur** | Gestionnaire technique de la plateforme | `roles: ["Admin"]` |

### 🆕 Séparation Utilisateur / Annonceur (v2.1)

```
┌─────────────────────────────────┐
│         VISITEUR                │  ← Non authentifié
│    Navigation, consultation     │
└─────────────┬───────────────────┘
              │ Inscription
              ▼
┌─────────────────────────────────┐
│        UTILISATEUR              │  ← Authentifié (roles: [])
│    Recherche, Favoris, Contact  │
│    ❌ Ne peut PAS publier       │
└─────────────┬───────────────────┘
              │ "Devenir Annonceur"
              ▼
┌─────────────────────────────────┐
│         ANNONCEUR               │  ← Authentifié (roles: ["Announcer"])
│  ✅ Publie, Crédits, Promotions │
└─────────────────────────────────┘
```

| Fonctionnalité | Utilisateur | Annonceur |
|----------------|:-----------:|:---------:|
| Rechercher | ✅ | ✅ |
| Favoris | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| Contacter annonceurs | ✅ | ✅ |
| **Publier des annonces** | ❌ | ✅ |
| **Acheter des crédits (mode manuel)** | ✅ | ✅ |
| **Promouvoir annonces** | ❌ | ✅ |
| **Assistant IA** | ❌ | ✅ |
| **Statistiques** | ❌ | ✅ |

### Acteurs Secondaires (systèmes externes)

| Système | Rôle |
|---------|------|
| **Firebase** | Backend (Firestore, Authentication, Storage, Cloud Functions) |
| **Google Maps / OpenStreetMap** | Géolocalisation et cartographie |
| **Support WhatsApp + OM/MoMo** | Recharge manuelle (dépôt externe + créditement manuel) |
| **Service Email** | Envoi d'emails (vérification, notifications) |
| **Service IA** | Génération automatique de contenu pour les annonces |
| **Google/Facebook OAuth** | Authentification sociale |

### 🔄 Migration Utilisateur → Annonceur

Un **Utilisateur** peut devenir **Annonceur** à tout moment via le flux suivant :

1. **Demande** : L'utilisateur clique sur "Devenir Annonceur"
2. **CGU** : Accepte les Conditions Générales d'Utilisation Annonceur
3. **Vérification** : Vérifie son numéro de téléphone (si pas déjà fait)
4. **Type** : Choisit son type d'annonceur (Particulier, Agence, Démarcheur, Agent)
5. **Profil** : Remplit ses informations professionnelles (optionnel)
6. **Activation** : Le système crée :
   - Rôle "Announcer" ajouté à `User.roles`
   - `AnnouncerProfile` créé
   - Solde de crédits existant conservé
   - Notification de confirmation

> ⚠️ La migration est **irréversible** : un Annonceur ne peut pas redevenir simple Utilisateur.

---

## 📊 Description des diagrammes

### 1. Diagramme de Contexte (`context-diagram.puml`)

Vue d'ensemble du système montrant :
- Les acteurs primaires et secondaires
- Les principales fonctionnalités du système
- Les interactions entre les acteurs et le système

### 2. Diagramme de Classes (`class-diagram.puml`) - v2.0

Modèle de données complet du système incluant :

**Entités principales :**
- `User` : Utilisateur avec rôles et favoris
- `CreditWallet` : Portefeuille de crédits (nouveau)
- `CreditPurchase` : Achat de crédits (nouveau)
- `CreditExpense` : Dépense de crédits (nouveau)
- `Property` : Bien immobilier avec localisation et promotion
- `Notification` : Notifications utilisateur

**Convention de nommage v2.0 :**
```
Avant (incohérent)          →   Après (anglais)
─────────────────────────────────────────────────
nbrChickens                 →   numberOfKitchens
nbrRooms                    →   numberOfRooms
additionnalInformation      →   additionalInfo
favoris                     →   favorites
nbrPiscine                  →   numberOfPools
```

**Hiérarchie des biens immobiliers :**
```
Property (base class)
├── Dwelling (habitation)
│   ├── Apartment
│   ├── Studio
│   └── Home
│       └── Villa
├── Building (Immeuble)
├── Desk (Bureau)
├── Shop (Boutique)
├── Kiosk (Kiosque)
├── Room (Chambre)
└── Land (Terrain)
```

### 3. Use Cases par Acteur

| Fichier | Acteur | Principales fonctionnalités |
|---------|--------|----------------------------|
| `use-cases-visiteur.puml` | Visiteur | Navigation, consultation, inscription |
| `use-cases-utilisateur.puml` | Utilisateur | Profil, favoris, notifications, **devenir annonceur** |
| `use-cases-recherche.puml` | **Tous** | Recherche avancée, alertes, comparaison, carte |
| `use-cases-annonceur.puml` | Annonceur | Publication, gestion, promotion, statistiques |
| `use-cases-credits.puml` | Utilisateur/Annonceur/Admin | Historique, recharge manuelle, dépense, gestion crédits |
| `use-cases-administrateur.puml` | Admin | Configuration, maintenance, diffusion des nouveautés plateforme |

---

## 💳 Système de Crédits (v2.0)

### Architecture Restructurée

```
┌─────────────────────────────────────────────────────────────┐
│                     SYSTÈME DE CRÉDITS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ CreditWallet │    │CreditPurchase│    │CreditExpense │  │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤  │
│  │ balance      │    │ packId       │    │ service      │  │
│  │ totalBought  │◄───│ amountXAF    │    │ credits      │  │
│  │ totalSpent   │    │ status       │    │ referenceId  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         ▲                   │                   │           │
│         │                   │                   │           │
│         └───────────────────┴───────────────────┘           │
│                          │                                  │
│                    Met à jour le solde                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Flux d'Achat

```
1. Utilisateur/Annonceur → Ouvre `/my-balance/recharge`
2. Sélectionne un pack (5, 10, 25, 50 crédits)
3. Contacte le support sur WhatsApp
4. Effectue un dépôt OM/MoMo (hors plateforme)
5. Envoie la référence de dépôt
6. Support → crédite manuellement le compte
7. Solde + historique mis à jour sur `/my-balance/history`
```

### Coûts en Crédits

| Service | Crédits |
|---------|---------|
| Publier annonce | 0 (gratuit) |
| Promotion Featured | 15 |
| Trending 7 jours | 10 |
| Trending 3 jours | 5 |
| Boost | 3 |
| Assistant IA | 1 |

---

## 🧪 Architecture des Tests

Une nouvelle structure de tests a été définie dans le plan de restructuration :

```
__tests__/
├── unit/                    # Tests unitaires
├── integration/             # Tests d'intégration
├── e2e/                     # Tests E2E (Playwright)
├── mocks/                   # Mocks centralisés
│   ├── factories/           # Factory pattern
│   └── services/            # Services mockés
└── reports/                 # Rapports
    ├── TEST_MATRIX.md       # Matrice des tests
    └── TEST_COVERAGE.md     # Rapport de couverture
```

**Voir :** 
- [`__tests__/reports/TEST_MATRIX.md`](../../__tests__/reports/TEST_MATRIX.md)
- [`__tests__/reports/TEST_COVERAGE.md`](../../__tests__/reports/TEST_COVERAGE.md)

---

## 🏠 Types de Biens Immobiliers

| Type | Code | Description |
|------|------|-------------|
| Maison | HOME | Maison individuelle |
| Appartement | APARTMENT | Logement dans un immeuble |
| Studio | STUDIO | Petit logement d'une pièce |
| Villa | VILLA | Maison de standing avec piscine |
| Immeuble | BUILDING | Bâtiment entier |
| Bureau | DESK | Espace de travail |
| Boutique | SHOP | Local commercial |
| Kiosque | KIOSK | Petit commerce |
| Chambre | ROOM | Chambre individuelle |
| Terrain | LAND | Parcelle de terrain |

---

## 🛠️ Comment visualiser les diagrammes

### Option 1 : PlantUML Online
1. Aller sur [PlantUML Web Server](http://www.plantuml.com/plantuml/uml/)
2. Copier-coller le contenu d'un fichier `.puml`
3. Le diagramme sera généré automatiquement

### Option 2 : Extension VS Code
1. Installer l'extension "PlantUML" de jebbs
2. Ouvrir un fichier `.puml`
3. Utiliser `Alt+D` pour prévisualiser

### Option 3 : IntelliJ IDEA
1. Installer le plugin "PlantUML Integration"
2. Ouvrir le fichier `.puml`
3. Le diagramme apparaît dans le panneau de prévisualisation

### Option 4 : Ligne de commande
```bash
# Installer PlantUML
brew install plantuml  # macOS
apt install plantuml   # Linux

# Générer les images
plantuml *.puml
```

---

## 📝 Conventions utilisées

### UML
- `<<include>>` : Cas d'utilisation obligatoirement inclus
- `<<extend>>` : Cas d'utilisation optionnel
- `◁—` : Relation d'héritage entre acteurs
- Les acteurs primaires sont colorés
- Les acteurs secondaires sont en gris

### Code (Convention v2.0)
| Élément | Convention | Exemple |
|---------|------------|---------|
| Variables | camelCase | `numberOfRooms` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_IMAGES_UPLOAD` |
| Types/Interfaces | PascalCase | `PropertyDetails` |
| Enums | SCREAMING_CASE values | `FOR_RENT` |
| Fichiers | kebab-case | `property-service.ts` |

**Langue : TOUT EN ANGLAIS**

---

## 🔄 Hiérarchie des Acteurs

```
Visiteur
    └── Utilisateur (Membre)
            ├── Chercheur (optionnel - recherche de logements)
            └── Annonceur (optionnel - publication d'annonces)
                    └── Administrateur
```

**Notes importantes :**
- Un utilisateur peut être **Chercheur** sans être Annonceur
- Un utilisateur peut être **Annonceur** sans être Chercheur
- Un utilisateur peut être **les deux** (Chercheur ET Annonceur)
- Les crédits sont uniquement nécessaires pour les Annonceurs

---

## 📚 Documents de Référence

| Document | Description |
|----------|-------------|
| [ANALYSE_PROBLEMES.md](./ANALYSE_PROBLEMES.md) | Analyse des problèmes identifiés |
| [PLAN_RESTRUCTURATION.md](./PLAN_RESTRUCTURATION.md) | 🆕 Plan de restructuration complet |

---

*Dernière mise à jour : 2026-01-12*  
*Version : 2.0*
