# 📁 Constantes - Documentation

## 🎯 Vue d'Ensemble

Le dossier `constantes` contient toutes les valeurs constantes utilisées dans l'application, notamment les routes, pour centraliser la gestion et éviter la duplication de code.

## 🛣️ Routes

### Structure des Routes

```typescript
export const routes = {
  protected: {
    // Routes nécessitant une authentification
    properties: '/property',
    add_property: '/property/add',
    // ...
  },
  public: {
    // Routes publiques accessibles à tous
    homePage: '/',
    search: '/search',
    blog: '/blog',
    // ...
  },
  public_google: {
    // Routes importantes pour le SEO Google
    homePage: '/',
    search: '/search',
    blog: '/blog',
    // ...
  }
}
```

### Utilisation des Routes

#### ✅ Bonne Pratique
```typescript
import { routes } from '@/constantes/routes'

// Utiliser les routes importées
<Link href={routes.public.homePage}>Accueil</Link>
<Link href={routes.public.blog}>Blog</Link>
```

#### ❌ Mauvaise Pratique
```typescript
// Éviter les routes en dur
<Link href="/">Accueil</Link>
<Link href="/blog">Blog</Link>
```

## 📝 Routes de Blog

### Routes Principales
- `routes.public.blog` - Page principale du blog
- `routes.public.blog_tendances_marche` - Article tendances marché
- `routes.public.blog_financement` - Article financement immobilier
- `routes.public.blog_seo_local` - Article SEO immobilier local
- `routes.public.blog_force_indexation` - Page test indexation

### Routes SEO Google
- `routes.public_google.blog` - Blog pour Google
- `routes.public_google.blog_tendances_marche` - Article tendances
- `routes.public_google.blog_financement` - Article financement
- `routes.public_google.blog_seo_local` - Article SEO local
- `routes.public_google.guide_immobilier_gabon` - Guide immobilier

## 🔧 Avantages de cette Approche

### 1. **Centralisation**
- Toutes les routes au même endroit
- Facile à maintenir et modifier
- Évite les erreurs de frappe

### 2. **Type Safety**
- TypeScript détecte les erreurs
- Autocomplétion dans l'IDE
- Refactoring automatique

### 3. **SEO Optimisé**
- Routes séparées pour Google (`public_google`)
- Priorité définie dans le sitemap
- Structure logique

### 4. **Maintenance**
- Changement d'URL en un seul endroit
- Cohérence dans toute l'application
- Documentation automatique

## 📊 Sitemap Integration

Le sitemap utilise les routes `public_google` pour définir les pages importantes pour Google :

```typescript
// Dans sitemap.xml/route.ts
const pages = [
  routes.public_google.homePage,          
  routes.public_google.search,
  routes.public_google.blog,
  routes.public_google.blog_tendances_marche,
  // ...
]
```

## 🚀 Ajout de Nouvelles Routes

### 1. Ajouter dans `routes.ts`
```typescript
public: {
  // ... routes existantes
  nouvelle_route: '/nouvelle-page',
},
public_google: {
  // ... routes existantes
  nouvelle_route: '/nouvelle-page', // Si important pour SEO
}
```

### 2. Utiliser dans les composants
```typescript
import { routes } from '@/constantes/routes'

<Link href={routes.public.nouvelle_route}>
  Nouvelle Page
</Link>
```

### 3. Ajouter au sitemap si nécessaire
```typescript
// Dans sitemap.xml/route.ts
const pages = [
  // ... pages existantes
  routes.public_google.nouvelle_route,
]
```

## 📋 Checklist pour Nouvelles Routes

- [ ] Route ajoutée dans `routes.public`
- [ ] Route ajoutée dans `routes.public_google` si SEO important
- [ ] Route utilisée dans les composants
- [ ] Route ajoutée au sitemap si nécessaire
- [ ] Tests de navigation fonctionnels
- [ ] Documentation mise à jour

## 🔍 Vérification

Pour vérifier que toutes les routes sont correctement utilisées :

```bash
# Rechercher les routes en dur
grep -r "href=\"/" src/components/
grep -r "href=\"/" src/app/

# Rechercher les routes importées
grep -r "routes\." src/
```

Cette approche garantit une maintenance facile et une cohérence parfaite dans toute l'application ! 🎯 