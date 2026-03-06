# Plan de Tests Manuels - Inscription (Tablette)

**Environnement :** Préprod  
**Taille d'écran :** Tablette (769px - 1024px)  
**Date :** À compléter  
**Testeur :** À compléter

---

## 📱 Configuration de Test

- **Viewport :** 768px × 1024px (iPad) ou équivalent
- **Navigateur :** Chrome / Safari / Firefox
- **URL de test :** `https://[preprod-url]/signup`

**Note :** Sur tablette, le formulaire peut utiliser soit le format mobile (formulaire unique) soit le format desktop (multi-étapes) selon la largeur exacte. Tester les deux cas si possible.

---

## ✅ Checklist de Tests

### 1. Affichage du Formulaire d'Inscription

**Objectif :** Vérifier que le formulaire s'affiche correctement sur tablette

**Étapes :**
1. Accéder à la page `/signup` sur tablette
2. Observer l'affichage du formulaire
3. Tester en mode portrait et paysage

**Résultat attendu :**
- ✅ Le formulaire s'affiche correctement (mobile ou desktop selon la largeur)
- ✅ Tous les éléments sont visibles et accessibles
- ✅ Le formulaire s'adapte bien en mode portrait et paysage
- ✅ Les espacements sont appropriés
- ✅ Le texte est lisible

**Bugs éventuels à noter :**
- [ ] Formulaire mal dimensionné
- [ ] Éléments superposés
- [ ] Texte trop petit ou trop grand
- [ ] Problèmes en mode paysage

---

### 2. Navigation Multi-Étapes (si format desktop)

**Objectif :** Vérifier la navigation entre les étapes du formulaire

**Étapes :**
1. Observer l'affichage des indicateurs d'étapes (si format desktop)
2. Remplir l'étape 1 (Identité)
3. Cliquer sur "Continuer"
4. Observer la transition vers l'étape 2
5. Vérifier que l'étape précédente est marquée comme complétée

**Résultat attendu :**
- ✅ Les indicateurs d'étapes sont visibles (ex: "Étape 1 sur 4")
- ✅ La navigation entre étapes est fluide
- ✅ Les étapes précédentes sont marquées comme complétées
- ✅ Le bouton "Retour" fonctionne (si présent)
- ✅ Les animations de transition sont fluides

**Bugs éventuels à noter :**
- [ ] Indicateurs d'étapes non visibles
- [ ] Navigation bloquée
- [ ] Transitions saccadées
- [ ] Bouton retour non fonctionnel

---

### 3. Étape 1 - Identité

**Objectif :** Vérifier la complétion de l'étape Identité

**Étapes :**
1. Vérifier que l'étape 1 s'affiche avec le titre "Qui êtes-vous ?"
2. Remplir le champ "Nom" avec "Doe"
3. Remplir le champ "Prénom" avec "John"
4. Cliquer sur "Continuer"

**Résultat attendu :**
- ✅ Les champs sont visibles et accessibles
- ✅ La validation fonctionne (erreurs si champs vides)
- ✅ Le bouton "Continuer" s'active quand les champs sont remplis
- ✅ Transition fluide vers l'étape 2

**Bugs éventuels à noter :**
- [ ] Champs non accessibles
- [ ] Validation non fonctionnelle
- [ ] Bouton continuer bloqué

---

### 4. Étape 2 - Contact

**Objectif :** Vérifier la complétion de l'étape Contact

**Étapes :**
1. Vérifier que l'étape 2 s'affiche avec le titre "Comment vous joindre ?"
2. Remplir l'email avec "test@example.com"
3. Remplir le téléphone avec un numéro valide (ex: +241061234567)
4. Observer la validation du téléphone
5. Cliquer sur "Continuer"

**Résultat attendu :**
- ✅ Les champs email et téléphone sont visibles
- ✅ La validation de l'email fonctionne
- ✅ La validation du téléphone fonctionne (formats 8 et 9 chiffres acceptés)
- ✅ Le bouton "Continuer" s'active quand les champs sont valides
- ✅ Transition fluide vers l'étape 3

**Bugs éventuels à noter :**
- [ ] Validation email incorrecte
- [ ] Validation téléphone incorrecte
- [ ] Bouton continuer bloqué

---

### 5. Étape 3 - Date de Naissance

**Objectif :** Vérifier la sélection de la date de naissance

**Étapes :**
1. Vérifier que l'étape 3 s'affiche
2. Cliquer sur le sélecteur "Jour"
3. Choisir "01"
4. Cliquer sur le sélecteur "Mois"
5. Choisir "Janvier"
6. Cliquer sur le sélecteur "Année"
7. Choisir "2000"
8. Cliquer sur "Continuer"

**Résultat attendu :**
- ✅ Les 3 sélecteurs sont visibles et fonctionnels
- ✅ Les listes déroulantes s'ouvrent correctement
- ✅ La sélection est enregistrée
- ✅ Le bouton "Continuer" s'active après sélection
- ✅ Transition fluide vers l'étape 4

**Bugs éventuels à noter :**
- [ ] Sélecteurs non fonctionnels
- [ ] Sélection non enregistrée
- [ ] Interface difficile à utiliser

---

### 6. Étape 4 - Sécurité

**Objectif :** Vérifier la complétion de l'étape Sécurité

**Étapes :**
1. Vérifier que l'étape 4 s'affiche avec le titre "Sécurisez votre compte"
2. Remplir le mot de passe avec "Password123!"
3. Remplir la confirmation avec "Password123!"
4. Cocher la case d'acceptation des conditions
5. Observer que le bouton "Créer mon compte" s'active

**Résultat attendu :**
- ✅ Les champs mot de passe sont visibles
- ✅ La validation de la force du mot de passe fonctionne
- ✅ La validation de la correspondance des mots de passe fonctionne
- ✅ La case à cocher est accessible
- ✅ Le bouton "Créer mon compte" s'active quand tout est valide

**Bugs éventuels à noter :**
- [ ] Validation mot de passe incorrecte
- [ ] Case à cocher non fonctionnelle
- [ ] Bouton de soumission bloqué

---

### 7. Validation des Champs - Erreurs

**Objectif :** Vérifier l'affichage des messages d'erreur

**Étapes :**
1. Tester chaque champ avec des valeurs invalides :
   - Email invalide
   - Téléphone invalide
   - Mot de passe trop faible
   - Mots de passe non correspondants
2. Observer les messages d'erreur

**Résultat attendu :**
- ✅ Les messages d'erreur sont clairs et compréhensibles
- ✅ Les messages apparaissent au bon moment
- ✅ Les messages disparaissent quand les erreurs sont corrigées
- ✅ Les messages sont visibles et lisibles

**Bugs éventuels à noter :**
- [ ] Messages d'erreur confus
- [ ] Messages non affichés
- [ ] Messages qui ne disparaissent pas

---

### 8. Erreur - Email Déjà Utilisé

**Objectif :** Vérifier l'affichage du toast d'erreur quand l'email existe déjà

**Étapes :**
1. Compléter toutes les étapes avec un email déjà utilisé (ex: `hetiwoh254@feanzier.com`)
2. Soumettre le formulaire
3. Observer le message d'erreur

**Résultat attendu :**
- ✅ Toast d'erreur avec titre "Email déjà utilisé"
- ✅ Description claire : "Cette adresse email est déjà associée à un compte existant..."
- ✅ Style destructif (rouge/erreur)
- ✅ L'utilisateur reste sur la page d'inscription

**Bugs éventuels à noter :**
- [ ] Toast non affiché
- [ ] Titre générique "Error"
- [ ] Message confus

---

### 9. Inscription Complète Réussie

**Objectif :** Vérifier le processus complet d'inscription avec succès

**Étapes :**
1. S'assurer que l'email `hetiwoh254@feanzier.com` n'existe pas
2. Compléter toutes les étapes :
   - Étape 1 : Nom "Test", Prénom "User"
   - Étape 2 : Email `hetiwoh254@feanzier.com`, Téléphone unique
   - Étape 3 : Date de naissance 01/01/2000
   - Étape 4 : Mot de passe "Password123!", Accepter conditions
3. Soumettre le formulaire
4. Observer le comportement

**Résultat attendu :**
- ✅ Toast de succès : "🎉 Bienvenue !" / "Votre compte a été créé avec succès!"
- ✅ Redirection vers `/signup/success?uid=[UID]`
- ✅ Page de succès affichée correctement
- ✅ Email de vérification envoyé

**Bugs éventuels à noter :**
- [ ] Toast de succès non affiché
- [ ] Pas de redirection
- [ ] Email non envoyé

---

### 10. Responsivité et Adaptation

**Objectif :** Vérifier que le formulaire s'adapte bien sur tablette

**Étapes :**
1. Tester en mode portrait (768px)
2. Tester en mode paysage (1024px)
3. Tester avec différentes orientations
4. Vérifier les espacements et la mise en page

**Résultat attendu :**
- ✅ Le formulaire s'adapte bien aux deux orientations
- ✅ Les éléments ne sont pas coupés
- ✅ Les espacements sont appropriés
- ✅ Le texte reste lisible
- ✅ Les boutons sont accessibles

**Bugs éventuels à noter :**
- [ ] Éléments coupés en mode paysage
- [ ] Espacements incorrects
- [ ] Texte illisible

---

### 11. Navigation et UX Globale

**Objectif :** Vérifier la fluidité globale de l'expérience

**Étapes :**
1. Parcourir tout le formulaire
2. Tester les transitions entre étapes
3. Vérifier les animations
4. Tester la navigation au clavier
5. Vérifier les temps de chargement

**Résultat attendu :**
- ✅ Navigation fluide entre les étapes
- ✅ Animations fluides (pas de saccades)
- ✅ Navigation au clavier fonctionnelle
- ✅ Temps de chargement acceptable
- ✅ Expérience utilisateur agréable

**Bugs éventuels à noter :**
- [ ] Navigation saccadée
- [ ] Animations bloquées
- [ ] Temps de chargement trop long
- [ ] Expérience utilisateur frustrante

---

## 📝 Notes de Test

**Date :** _______________  
**Testeur :** _______________  
**Environnement :** Préprod  
**Version :** _______________

### Résumé des Tests

- ✅ Tests réussis : _____ / 11
- ❌ Tests échoués : _____ / 11
- ⚠️ Tests partiels : _____ / 11

### Bugs Critiques Identifiés

1. 
2. 
3. 

### Bugs Mineurs Identifiés

1. 
2. 
3. 

### Améliorations Suggérées

1. 
2. 
3. 

### Commentaires Généraux

---

## 🔄 Tests de Régression

Après correction des bugs, réexécuter les tests suivants :

- [ ] Test 8 : Erreur email déjà utilisé
- [ ] Test 9 : Inscription complète réussie
- [ ] Test 11 : Navigation et UX globale
