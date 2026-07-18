# Documentation - Plateforme Location Maison Gabon

Bienvenue dans la documentation complète de la plateforme de location et vente immobilière au Gabon.

## 📁 Structure de la Documentation

### 🎯 Workflow & Processus
- **[workflow/](./workflow/)** : Workflow d'implémentation complet
  - Initialisation du projet
  - Workflow par feature
  - Pipelines CI/CD
  - Tests et déploiement

### 🏗️ Architecture & Design
- **[uml/](./uml/)** : Diagrammes UML
  - Diagramme de contexte
  - Diagramme de classes
  - Cas d'utilisation par acteur
  - Analyse des problèmes
  - Plan de restructuration

### 📋 Features
- **[feature/](./feature/)** : Documentation des features
  - Annuaire des features
  - Spécifications par feature (UX, UI, UML)
  - Auth (index): [feature/auth/README.md](./feature/auth/README.md)
  - Users (index): [feature/users/README.md](./feature/users/README.md)
  - Annonceur (index): [feature/annonceur/README.md](./feature/annonceur/README.md)
  - Recherche IA (index): [feature/recherche-ia/README.md](./feature/recherche-ia/README.md)
  - Publicité (régie first-party): [feature/publicite/README.md](./feature/publicite/README.md)

### 🧾 Formulaire d'ajout de logement
- **[form-ajout-logement/](./form-ajout-logement/)** : Documentation UX/UI et technique du parcours d'ajout
  - Localisation: [form-ajout-logement/location.md](./form-ajout-logement/location.md)
  - Refonte mobile UX: [form-ajout-logement/mobile-ux-refonte.md](./form-ajout-logement/mobile-ux-refonte.md)

### ⚙️ Configuration & Setup
- **[setup/](./setup/)** : Guides de configuration
  - Airtel Money
  - Email (Gmail, Hostinger)
  - Firebase Phone Auth
  - SMS Production
  - Google Search Console

### 📧 Email
- **[email/](./email/)** : Documentation système email
  - Guide recherche emails
  - Résolution problèmes
  - Système opérationnel

### 📱 Téléphone & SMS
- **[phone/](./phone/)** : Documentation téléphone
  - Numérotation Gabon
  - Validation téléphone
  - Tests et dépannage SMS

### 🔌 API
- **[api/](./api/)** : Documentation API
  - API Authentification

### ⚙️ Configuration
- **[config/](./config/)** : Configuration projet
  - Variables d'environnement

### 📲 Progressive Web App (PWA)
- **[pwa/](./pwa/)** : Passage a une PWA production-grade
  - Architecture cible
  - Strategie de cache runtime
  - Fallback offline
  - Install prompt centralise
  - Runbook incident PWA

### 🔍 SEO
- **[seo/](./seo/)** : Documentation SEO
  - Structure SEO

### 🔄 Migration
- **[migration/](./migration/)** : Migrations et améliorations
  - Résumé migrations
  - Amélioration délivrabilité

### 🔧 Dépannage
- **[troubleshooting/](./troubleshooting/)** : Diagnostic et dépannage
  - Diagnostic signup

### 🗺️ Cartographie
- **[carte/](./carte/)** : Documentation cartographie
  - Composants carte
  - Stratégie cache
  - Polygones

### 📍 Localisation
- **[localisation/](./localisation/)** : Documentation localisation

### 📊 Statistiques
- **[statistics/](./statistics/)** : Documentation statistiques

### 📈 Trackers
- **[trackers/](./trackers/)** : Plan d'implementation tracking produit
  - Taxonomie des evenements
  - Couche technique de tracking
  - Dashboards et exploitation metrics

### ✅ Tests & Qualité
- **[testing/](./testing/PLAN-DE-TESTS.md)** : Plan global de tests
  - Tests métier et Cloud Functions
  - Tests d'idempotence, coûts Firebase et règles de sécurité
  - Tests de parcours, UX mobile, publicités et cohérence visuelle

### 🤖 Scripts d'import
- **[scripts/apify-facebook-cursor/](./scripts/apify-facebook-cursor/)** : Architecture cible du pipeline d'import annonces Facebook
  - Refactor pro (patterns, couches, idempotence)
  - Configuration agences (uid/documentId/source)
  - Plan de migration du legacy vers V2

---

## 🚀 Démarrage Rapide

### Pour les développeurs
1. Lire [workflow/WORKFLOW.md](./workflow/WORKFLOW.md) pour comprendre le processus de développement
2. Consulter [uml/README.md](./uml/README.md) pour comprendre l'architecture
3. Vérifier [feature/ANNUAIRE.md](./feature/ANNUAIRE.md) pour voir les features à implémenter

### Pour la configuration
1. [setup/](./setup/) : Guides de configuration des services externes
2. [config/ENV_VARIABLES.md](./config/ENV_VARIABLES.md) : Variables d'environnement

### Pour le dépannage
1. [troubleshooting/](./troubleshooting/) : Guides de diagnostic
2. [email/](./email/) : Problèmes d'email
3. [phone/](./phone/) : Problèmes SMS/téléphone

---

## 📚 Documentation Externe

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Algolia Documentation](https://www.algolia.com/doc/)
- [Playwright Documentation](https://playwright.dev/docs/intro)

---

*Dernière mise à jour : 2026-03-19*
