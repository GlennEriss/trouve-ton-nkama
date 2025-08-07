# Guide Google Search Console - Indexation TonNkama

## 🎯 Objectif
Forcer l'indexation de votre site par Google pour que vos pages apparaissent dans les résultats de recherche.

## 📋 Étapes obligatoires

### 1. **Ajouter votre site à Google Search Console**

#### Étape 1 : Accéder à Google Search Console
- Allez sur : https://search.google.com/search-console
- Connectez-vous avec votre compte Google

#### Étape 2 : Ajouter votre propriété
- Cliquez sur "Ajouter une propriété"
- Entrez votre URL : `https://www.tonnkama.com`
- Choisissez "Domaine" (recommandé) ou "Préfixe d'URL"

#### Étape 3 : Vérifier la propriété
**Option A - Fichier HTML (recommandé) :**
- Téléchargez le fichier HTML fourni par Google
- Placez-le dans votre dossier `public/`
- Déployez votre site
- Cliquez sur "Vérifier" dans Google Search Console

**Option B - Balise meta :**
- Ajoutez la balise meta dans votre `<head>`
- Déployez votre site
- Cliquez sur "Vérifier"

### 2. **Soumettre votre sitemap**

Une fois votre site vérifié :
1. Allez dans "Sitemaps" dans le menu de gauche
2. Cliquez sur "Ajouter un sitemap"
3. Entrez : `sitemap.xml`
4. Cliquez sur "Envoyer"

### 3. **Demander l'indexation de pages spécifiques**

#### Pour la page d'accueil :
1. Allez dans "URL Inspection" (barre de recherche en haut)
2. Entrez : `https://www.tonnkama.com/`
3. Cliquez sur "Demander l'indexation"

#### Pour d'autres pages importantes :
- `https://www.tonnkama.com/search`
- `https://www.tonnkama.com/blog`
- `https://www.tonnkama.com/property`

## ⏱️ Délais d'indexation

- **Première indexation** : 1-4 semaines
- **Pages importantes** : 1-7 jours après soumission
- **Mises à jour** : 1-3 jours

## 📊 Surveiller l'indexation

### Dans Google Search Console :
1. **Couverture** : Voir les pages indexées/non indexées
2. **Performance** : Voir les impressions et clics
3. **URL Inspection** : Vérifier le statut d'une URL spécifique

### Commandes utiles :
```bash
# Vérifier si une page est indexée
curl -I https://www.tonnkama.com

# Vérifier le sitemap
curl https://www.tonnkama.com/sitemap.xml

# Tester la réponse mobile
curl -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" https://www.tonnkama.com
```

## 🔍 Vérifier l'indexation manuellement

### Recherche Google :
- `site:tonnkama.com` - Voir toutes les pages indexées
- `"Trouve Ton Nkama"` - Rechercher votre marque
- `"immobilier Gabon" site:tonnkama.com` - Recherche spécifique

## 🚨 Problèmes courants

### 1. **Site non trouvé par Google**
- Vérifiez que votre robots.txt n'empêche pas l'indexation
- Assurez-vous que votre site est accessible publiquement
- Vérifiez qu'il n'y a pas de redirection en boucle

### 2. **Pages non indexées**
- Vérifiez les erreurs dans Google Search Console
- Assurez-vous que les pages sont dans votre sitemap
- Vérifiez que les pages ne sont pas en noindex

### 3. **Indexation lente**
- Normal pour les nouveaux sites
- Améliorez la vitesse de chargement
- Créez plus de contenu de qualité

## 📈 Optimisations pour accélérer l'indexation

### 1. **Liens externes**
- Partagez votre site sur les réseaux sociaux
- Créez des backlinks depuis d'autres sites
- Mentionnez votre site sur des forums/groupes

### 2. **Contenu frais**
- Publiez régulièrement de nouveaux articles
- Mettez à jour votre contenu existant
- Créez du contenu unique et de qualité

### 3. **Technique**
- Optimisez la vitesse de chargement
- Assurez-vous que le site est responsive
- Vérifiez qu'il n'y a pas d'erreurs 404

## ✅ Checklist de vérification

- [ ] Site ajouté à Google Search Console
- [ ] Propriété vérifiée
- [ ] Sitemap soumis
- [ ] Pages importantes demandées en indexation
- [ ] Robots.txt accessible
- [ ] Site accessible publiquement
- [ ] Pas d'erreurs 404
- [ ] Vitesse de chargement optimale

## 🎯 Résultat attendu

Après 1-4 semaines, vous devriez voir :
- Votre site apparaître dans `site:tonnkama.com`
- Votre page d'accueil en première position
- Des impressions dans Google Search Console
- Des clics depuis les résultats de recherche

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les erreurs dans Google Search Console
2. Consultez la documentation Google
3. Contactez le support Google si nécessaire 