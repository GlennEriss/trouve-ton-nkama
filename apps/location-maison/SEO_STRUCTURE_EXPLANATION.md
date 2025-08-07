# Structure SEO - TonNkama

## 🏗️ **Architecture SEO actuelle**

### **Layout.tsx (Métadonnées globales)**
- ✅ **Métadonnées de base** : title, description, keywords
- ✅ **Open Graph** : Pour les réseaux sociaux
- ✅ **Twitter Cards** : Pour Twitter
- ✅ **Schema.org RealEstateAgent** : Données structurées pour l'agence
- ✅ **Balises meta** : Google verification, canonical, etc.

### **Page.tsx (Métadonnées spécifiques page d'accueil)**
- ✅ **Titre optimisé** : "Immobilier Gabon - Trouve Ton Nkama | Location & Vente Maisons, Appartements Libreville"
- ✅ **Description ciblée** : Spécifique au Gabon et aux villes principales
- ✅ **Mots-clés** : Optimisés pour le marché immobilier gabonais
- ✅ **Canonical** : URL canonique de la page d'accueil
- ✅ **Robots** : Instructions spécifiques pour Google Bot
- ✅ **Schema.org WebSite** : Données structurées pour le site web

## 🔄 **Hiérarchie des métadonnées**

### **Principe Next.js 13+**
1. **Layout.tsx** : Métadonnées par défaut
2. **Page.tsx** : Métadonnées spécifiques (écrasent les défauts)
3. **Fusion intelligente** : Next.js combine automatiquement

### **Ce qui est conservé du Layout**
- ✅ Open Graph (réseaux sociaux)
- ✅ Twitter Cards
- ✅ Schema.org RealEstateAgent
- ✅ Balises meta techniques

### **Ce qui est spécifique à la page d'accueil**
- ✅ Titre optimisé pour Google
- ✅ Description ciblée Gabon
- ✅ Mots-clés spécifiques
- ✅ Schema.org WebSite (complémentaire)

## ✅ **Avantages de cette structure**

### **1. Respect de l'architecture Next.js**
- Pas de conflit entre layout et page
- Métadonnées héritées correctement
- Performance optimale

### **2. SEO optimisé**
- **Double Schema.org** : RealEstateAgent + WebSite
- **Métadonnées riches** : Titre, description, mots-clés
- **Instructions Google** : Robots meta spécifiques

### **3. Compatibilité**
- ✅ Pas de cassure de fonctionnalités
- ✅ Respect de la structure existante
- ✅ Amélioration progressive

## 🎯 **Résultat pour Google**

### **Données structurées complètes**
```json
{
  "@type": "RealEstateAgent",  // Layout.tsx
  "name": "Trouve Ton Nkama",
  "address": "Libreville, Gabon",
  // ... autres données d'agence
}

{
  "@type": "WebSite",          // Page.tsx
  "name": "Trouve Ton Nkama",
  "potentialAction": {
    "@type": "SearchAction"     // Fonction de recherche
  }
}
```

### **Métadonnées optimisées**
- **Titre** : "Immobilier Gabon - Trouve Ton Nkama | Location & Vente Maisons, Appartements Libreville"
- **Description** : Ciblée Gabon avec villes principales
- **Mots-clés** : Spécifiques au marché immobilier gabonais

## 🚀 **Impact sur le référencement**

### **Avantages**
1. **Double indexation** : Agence + Site web
2. **Mots-clés ciblés** : "immobilier Gabon", "Libreville"
3. **Fonction de recherche** : Google peut proposer votre site
4. **Données riches** : Plus d'informations pour Google

### **Risques éliminés**
- ❌ Pas de conflit de métadonnées
- ❌ Pas de duplication de contenu
- ❌ Pas de cassure de fonctionnalités
- ❌ Respect de l'architecture existante

## 📋 **Vérification**

### **Test de fonctionnement**
```bash
# Vérifier que le site fonctionne
curl -I https://www.tonnkama.com

# Vérifier le sitemap
curl https://www.tonnkama.com/sitemap.xml

# Vérifier les métadonnées
curl https://www.tonnkama.com | grep -i "title\|description"
```

### **Résultat attendu**
- ✅ Site accessible
- ✅ Sitemap valide
- ✅ Métadonnées présentes
- ✅ Pas d'erreurs console

## 🎯 **Conclusion**

La structure actuelle est **optimale** et **sûre** :

1. **Respecte l'architecture** Next.js
2. **Améliore le SEO** sans casser l'existant
3. **Double indexation** Google (agence + site)
4. **Mots-clés ciblés** pour le Gabon
5. **Données structurées** complètes

**Aucun dégât causé** - seulement des améliorations SEO ! 🚀 