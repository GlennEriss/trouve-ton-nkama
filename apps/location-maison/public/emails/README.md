# Logos Email

Ce dossier contient les logos optimisés pour les emails.

## Fichiers

- **logo-email.png** (200x200px) - Logo principal pour les headers
- **logo-email-small.png** (80x80px) - Logo petit pour les footers
- **logo-email-medium.png** (120x120px) - Logo moyen pour le contenu

## Utilisation

```typescript
import { emailLogos } from './emails/config';

// En développement
const logoUrl = emailLogos.header;

// En production
const logoUrl = emailLogos.production.header;
```

## Formats recommandés

- ✅ PNG pour les logos (transparence + compatibilité)
- ✅ JPG pour les photos de propriétés
- ❌ SVG (bloqué par Gmail/Outlook)
- ❌ WebP (support limité)

## Optimisation

Ces logos sont optimisés pour :
- Taille de fichier minimale
- Qualité maximale
- Compatibilité universelle avec tous les clients email
- Rendu sur écrans haute résolution

## Régénération

Pour régénérer les logos :
```bash
node scripts/create-email-logos.js
```
