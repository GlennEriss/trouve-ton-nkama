# Système d'emails Trouve Ton Nkama

Un système complet de templates d'emails React pour la plateforme immobilière Trouve Ton Nkama.

## 📧 Templates disponibles

- **EmailVerification** - Vérification d'email
- **PasswordReset** - Réinitialisation de mot de passe
- **WelcomeEmail** - Email de bienvenue
- **PropertyNotification** - Notification de nouvelles propriétés
- **PropertyPublished** - Confirmation de publication d'annonce

## 🖼️ Optimisation des images pour les emails

### Formats recommandés par priorité :

1. **PNG** (Recommandé pour les logos)
   - ✅ Support universel
   - ✅ Transparence supportée
   - ✅ Qualité excellente
   - ❌ Fichiers plus volumineux

2. **JPG/JPEG** (Recommandé pour les photos)
   - ✅ Support universel
   - ✅ Tailles optimisées
   - ❌ Pas de transparence

3. **SVG** (À éviter dans les emails)
   - ❌ Bloqué par Gmail/Outlook
   - ❌ Problèmes de sécurité

4. **WebP** (À éviter dans les emails)
   - ❌ Support limité

### Créer un logo PNG optimisé :

#### Option 1 : Conversion en ligne
1. Aller sur [SVG to PNG Converter](https://svgtopng.com/)
2. Uploader `public/logob-02-removebg-preview.svg`
3. Définir la taille : **200x200px** (pour le header), **80x80px** (pour le footer)
4. Télécharger et renommer en `logo-email.png`

#### Option 2 : Avec ImageMagick (si installé)
```bash
# Installer ImageMagick
brew install imagemagick

# Convertir le logo
convert public/logob-02-removebg-preview.svg -resize 200x200 public/logo-email.png
```

#### Option 3 : Avec Node.js sharp
```bash
npm install sharp --save-dev
```

```javascript
const sharp = require('sharp');

sharp('public/logob-02-removebg-preview.svg')
  .resize(200, 200)
  .png()
  .toFile('public/logo-email.png');
```

### Optimisations recommandées :

1. **Tailles optimales :**
   - Logo header : 200x200px max
   - Logo footer : 80x80px max
   - Images de propriétés : 600x400px max

2. **Compression :**
   - PNG : Utiliser [TinyPNG](https://tinypng.com/)
   - JPG : Qualité 85-90%

3. **Noms de fichiers :**
   - `logo-email.png` - Logo principal
   - `logo-email-small.png` - Logo footer
   - `property-placeholder.jpg` - Image par défaut

## 🎨 Intégration dans votre projet

### Étape 1 : Créer les images optimisées
```bash
# Créer le dossier pour les images email
mkdir -p public/emails

# Copier et convertir vos images
# ... (suivre les instructions ci-dessus)
```

### Étape 2 : Mettre à jour les URLs
```typescript
// Dans votre code
const logoUrl = "https://tonnkama.com/emails/logo-email.png";

// Ou pour le développement local
const logoUrl = "/emails/logo-email.png";
```

### Étape 3 : Tester la compatibilité
```bash
# Lancer l'aperçu
npm run email

# Tester dans différents clients :
# - Gmail (web + app)
# - Outlook (web + app)
# - Apple Mail
# - Yahoo Mail
```

## 📱 Compatibilité des clients email

| Client | PNG | JPG | SVG | WebP |
|--------|-----|-----|-----|------|
| Gmail | ✅ | ✅ | ❌ | ❌ |
| Outlook | ✅ | ✅ | ❌ | ❌ |
| Apple Mail | ✅ | ✅ | ⚠️ | ⚠️ |
| Yahoo | ✅ | ✅ | ❌ | ❌ |
| Thunderbird | ✅ | ✅ | ⚠️ | ❌ |

**Légende :**
- ✅ Support complet
- ⚠️ Support partiel
- ❌ Pas de support

## 🚀 Utilisation

### Exemple basique
```typescript
import { EmailService } from './emails';

const html = EmailService.renderWelcomeEmail({
  name: "John Doe",
  email: "john@example.com",
  loginUrl: "https://tonnkama.com/login"
});
```

### Exemple avec logo personnalisé
```typescript
const html = EmailService.renderWelcomeEmail({
  name: "John Doe",
  email: "john@example.com",
  loginUrl: "https://tonnkama.com/login",
  texts: {
    ...EmailService.getDefaultTexts('fr'),
    logoUrl: "https://tonnkama.com/emails/logo-email.png"
  }
});
```

## 📊 Bonnes pratiques

1. **Taille des images :**
   - Logos : < 50KB
   - Photos : < 200KB
   - Largeur max : 600px

2. **Noms de fichiers :**
   - Pas d'espaces ou caractères spéciaux
   - Utiliser des tirets : `logo-email.png`

3. **Accessibilité :**
   - Toujours inclure un `alt` text
   - Utiliser des contrastes suffisants

4. **Performance :**
   - Optimiser toutes les images
   - Utiliser un CDN si possible
   - Prévoir des images de fallback

## 🔧 Intégration API

### Avec Next.js API Routes
```typescript
// pages/api/send-email.ts
import { EmailService } from '../../src/emails';

export default async function handler(req, res) {
  const emailHtml = EmailService.renderWelcomeEmail({
    name: req.body.name,
    email: req.body.email,
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
  });

  // Envoyer l'email avec votre service favori
  // (Nodemailer, SendGrid, etc.)
}
```

### Avec des hooks React
```typescript
// hooks/use-email-sender.ts
import { useState } from 'react';
import { EmailService } from '../emails';

export const useEmailSender = () => {
  const [loading, setLoading] = useState(false);

  const sendWelcomeEmail = async (userData) => {
    setLoading(true);
    try {
      const html = EmailService.renderWelcomeEmail(userData);
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, to: userData.email })
      });
    } finally {
      setLoading(false);
    }
  };

  return { sendWelcomeEmail, loading };
};
```

## 🧪 Tests

```bash
# Lancer les tests
npm test

# Prévisualiser les emails
npm run email
```

## 🔗 Ressources utiles

- [React Email Documentation](https://react.email/)
- [Email Client CSS Support](https://www.campaignmonitor.com/css/)
- [TinyPNG](https://tinypng.com/) - Compression PNG
- [Can I Email](https://www.caniemail.com/) - Support CSS dans les emails 