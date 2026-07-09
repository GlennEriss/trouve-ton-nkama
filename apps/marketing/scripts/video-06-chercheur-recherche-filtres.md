# Vidéo 6 — Recherche, filtres et contact
**"Chercher un logement et contacter l'annonceur"**

- Format : 9:16 vertical, 1080 x 1920 px
- Durée cible : environ 75 secondes
- Type : vraie capture mobile de l'app en localhost
- Environnement : `http://localhost:3000`
- Objectif : montrer le parcours complet d'une personne qui cherche un logement
- Règle : ne pas produire la vidéo tant que ce script n'est pas validé

---

## Intention

Cette vidéo doit répondre à une question simple :

> "Comment je cherche un logement sur Trouve Ton Nkama, puis comment je contacte l'annonceur ?"

Le parcours doit rester naturel :

1. chercher rapidement avec la barre de recherche ;
2. regarder les premiers résultats ;
3. ouvrir une annonce ;
4. revenir à une recherche plus précise avec les filtres ;
5. filtrer une maison à louer ;
6. ouvrir une annonce filtrée ;
7. aller jusqu'aux contacts de l'annonceur.

---

## Parcours Validé

### Etape 1 — Arriver sur la recherche

But : installer le contexte.

Action écran :

1. ouvrir `http://localhost:3000/search` ;
2. attendre que les annonces chargent ;
3. faire une pause courte sur la liste.

Voix off :

> "Vous cherchez un logement au Gabon ? Ouvrez Trouve Ton Nkama."

Overlay :

> **Recherche logement**

Durée : 4 secondes.

---

### Etape 2 — Utiliser la barre de recherche

But : montrer une recherche simple.

Action écran :

1. cliquer dans la barre de recherche ;
2. taper lentement `studio` ;
3. attendre une demi-seconde ;
4. laisser les résultats se stabiliser.

Voix off :

> "Commencez par taper ce que vous cherchez."

Overlay :

> **Studio**

Durée : 7 secondes.

---

### Etape 3 — Scroller les premiers résultats

But : montrer que les annonces apparaissent directement.

Action écran :

1. scroller lentement les résultats ;
2. montrer 2 ou 3 cartes ;
3. laisser visibles les photos, les prix et les quartiers.

Voix off :

> "Les annonces correspondantes s'affichent avec les photos, les prix et les quartiers."

Overlay :

> **Résultats**

Durée : 6 secondes.

---

### Etape 4 — Ouvrir une première annonce

But : montrer que l'utilisateur peut consulter les détails.

Action écran :

1. s'arrêter sur une annonce de studio ;
2. laisser lire le titre et le prix ;
3. ouvrir l'annonce ;
4. attendre que la fiche détail charge.

Voix off :

> "Quand une annonce vous intéresse, ouvrez-la pour voir les détails."

Overlay :

> **Voir les détails**

Durée : 6 secondes.

---

### Etape 5 — Revenir à la recherche

But : préparer la deuxième méthode avec les filtres.

Action écran :

1. revenir à la page de recherche ;
2. remonter vers le haut si nécessaire ;
3. laisser visible la barre de recherche et le bouton filtre.

Voix off :

> "Vous pouvez aussi faire une recherche plus précise avec les filtres."

Overlay :

> **Recherche précise**

Durée : 5 secondes.

---

### Etape 6 — Montrer le bouton filtre

But : aider les utilisateurs à repérer le bouton.

Action écran :

1. afficher une flèche overlay qui pointe précisément vers le bouton filtre ;
2. garder la flèche environ une seconde ;
3. cliquer sur le bouton filtre ;
4. attendre que le panneau soit entièrement ouvert.

Indication montage :

- la flèche doit pointer sur l'icône ou le bouton filtre, pas à côté ;
- ajouter un petit label : **Filtres** ;
- retirer la flèche dès que le panneau s'ouvre.

Voix off :

> "Le bouton filtre se trouve ici."

Overlay :

> **Filtres**

Durée : 5 secondes.

---

### Etape 7 — Filtrer une maison à louer

But : montrer une recherche ciblée.

Action écran :

1. sélectionner le type de bien : **Maison** ;
2. sélectionner le statut : **À louer** ;
3. faire une pause courte après chaque choix.

Voix off :

> "Ici, on cherche une maison à louer."

Overlay :

> **Maison à louer**

Durée : 7 secondes.

---

### Etape 8 — Choisir la zone

But : montrer clairement la province et la ville.

Action écran :

1. aller au champ **Province** ;
2. sélectionner **Estuaire** ;
3. aller au champ **Ville** ;
4. sélectionner **Libreville** ;
5. si le champ existe, sélectionner un quartier disponible comme **Awendjé**.

Ce plan est obligatoire :

- on doit voir **Province : Estuaire** ;
- on doit voir **Ville : Libreville** ;
- le quartier est utile si les résultats restent cohérents.

Voix off :

> "Ensuite, choisissez la zone : Estuaire, puis Libreville."

Overlay :

> **Estuaire · Libreville**

Durée : 9 secondes.

---

### Etape 9 — Appliquer les filtres

But : montrer la conséquence directe des filtres.

Action écran :

1. cliquer sur le bouton d'application des filtres ;
2. attendre le retour à la liste ;
3. laisser les résultats filtrés se stabiliser.

Important :

- les résultats doivent apparaître sans actualiser la page ;
- si la page ne revient pas automatiquement à la liste, fermer le panneau proprement ;
- ne pas couper trop vite après l'application.

Voix off :

> "Appliquez les filtres pour afficher uniquement les annonces qui correspondent."

Overlay :

> **Résultats filtrés**

Durée : 6 secondes.

---

### Etape 10 — Scroller les résultats filtrés

But : montrer que la liste a bien changé.

Action écran :

1. scroller lentement les résultats filtrés ;
2. montrer au moins une annonce de maison ;
3. laisser visibles le titre, le prix et le quartier.

Voix off :

> "Vous obtenez une liste plus ciblée."

Overlay :

> **Annonces ciblées**

Durée : 6 secondes.

---

### Etape 11 — Ouvrir une annonce filtrée

But : rendre la sélection logique.

Action écran :

1. s'arrêter sur une annonce issue des résultats filtrés ;
2. laisser lire la carte ;
3. ouvrir l'annonce ;
4. attendre que la fiche détail charge.

Annonce cible recommandée en localhost :

- Maison à louer à Awendjé ;
- Province : Estuaire ;
- Ville : Libreville ;
- Type : Maison ;
- Statut : À louer.

Voix off :

> "Ouvrez ensuite l'annonce qui vous intéresse."

Overlay :

> **Annonce sélectionnée**

Durée : 6 secondes.

---

### Etape 12 — Montrer les contacts de l'annonceur

But : finir sur l'action concrète.

Action écran :

1. dans la fiche détail, scroller jusqu'à la section contact ;
2. s'arrêter quand les boutons de contact sont visibles ;
3. montrer le bouton d'appel ;
4. montrer le bouton WhatsApp ;
5. ne pas ouvrir d'application externe.

Ce que le spectateur doit comprendre :

- il peut appeler l'annonceur ;
- il peut aussi le contacter directement par WhatsApp ;
- tout se fait depuis la fiche de l'annonce.

Voix off :

> "Dans les détails, allez jusqu'aux contacts. Vous pouvez appeler l'annonceur ou lui écrire directement sur WhatsApp."

Overlay :

> **Appel · WhatsApp**

Durée : 9 secondes.

---

### Etape 13 — CTA final

But : conclure simplement.

Action écran :

Fond propre avec :

- logo Trouve Ton Nkama ;
- nom de la plateforme ;
- `tonnkama.com`.

Voix off :

> "Trouve Ton Nkama. Disponible sur tonnkama.com."

Durée : 4 secondes.

---

## Timing Global

| Temps | Plan | Durée |
|-------|------|-------|
| 0:00 - 0:04 | Arrivée sur la recherche | 4s |
| 0:04 - 0:11 | Saisie `studio` | 7s |
| 0:11 - 0:17 | Scroll premiers résultats | 6s |
| 0:17 - 0:23 | Ouverture d'une première annonce | 6s |
| 0:23 - 0:28 | Retour recherche | 5s |
| 0:28 - 0:33 | Flèche + ouverture filtres | 5s |
| 0:33 - 0:40 | Type Maison + À louer | 7s |
| 0:40 - 0:49 | Estuaire + Libreville | 9s |
| 0:49 - 0:55 | Appliquer les filtres | 6s |
| 0:55 - 1:01 | Scroll résultats filtrés | 6s |
| 1:01 - 1:07 | Ouvrir une annonce filtrée | 6s |
| 1:07 - 1:16 | Section contact : appel + WhatsApp | 9s |
| 1:16 - 1:20 | CTA final | 4s |

Durée cible : environ 80 secondes.

---

## Script Voix Off

```text
Vous cherchez un logement au Gabon ? Ouvrez Trouve Ton Nkama.

Commencez par taper ce que vous cherchez.

Les annonces correspondantes s'affichent avec les photos, les prix et les quartiers.

Quand une annonce vous intéresse, ouvrez-la pour voir les détails.

Vous pouvez aussi faire une recherche plus précise avec les filtres.

Le bouton filtre se trouve ici.

Ici, on cherche une maison à louer.

Ensuite, choisissez la zone : Estuaire, puis Libreville.

Appliquez les filtres pour afficher uniquement les annonces qui correspondent.

Vous obtenez une liste plus ciblée.

Ouvrez ensuite l'annonce qui vous intéresse.

Dans les détails, allez jusqu'aux contacts. Vous pouvez appeler l'annonceur ou lui écrire directement sur WhatsApp.

Trouve Ton Nkama. Disponible sur tonnkama.com.
```

---

## Synchronisation Voix / Actions

La voix off doit suivre exactement ce qui se passe à l'écran.

| Temps | Action visible | Voix off synchronisée |
|-------|----------------|----------------------|
| 0:00 - 0:04 | Page `/search`, annonces visibles | "Vous cherchez un logement au Gabon ? Ouvrez Trouve Ton Nkama." |
| 0:04 - 0:11 | Clic barre, saisie `studio à louer` | "Commencez par taper ce que vous cherchez." |
| 0:11 - 0:17 | Scroll lent des résultats | "Les annonces correspondantes s'affichent..." |
| 0:17 - 0:23 | Clic sur une annonce | "Quand une annonce vous intéresse..." |
| 0:23 - 0:28 | Retour à la recherche | "Vous pouvez aussi faire une recherche plus précise..." |
| 0:28 - 0:33 | Flèche vers filtre, panneau ouvert | "Le bouton filtre se trouve ici." |
| 0:33 - 0:40 | Sélection Maison + À louer | "Ici, on cherche une maison à louer." |
| 0:40 - 0:49 | Sélection Estuaire puis Libreville | "Ensuite, choisissez la zone..." |
| 0:49 - 0:55 | Application des filtres | "Appliquez les filtres..." |
| 0:55 - 1:01 | Scroll résultats filtrés | "Vous obtenez une liste plus ciblée." |
| 1:01 - 1:07 | Ouverture annonce filtrée | "Ouvrez ensuite l'annonce..." |
| 1:07 - 1:16 | Section contacts visible | "Dans les détails, allez jusqu'aux contacts..." |
| 1:16 - 1:20 | CTA final | "Trouve Ton Nkama. Disponible sur tonnkama.com." |

Règles :

- ne jamais annoncer une action avant qu'elle soit visible ;
- commencer la phrase sur les contacts uniquement quand les boutons appel et WhatsApp sont à l'écran ;
- si une action prend plus de temps pendant la capture, rallonger la pause écran plutôt que parler trop vite ;
- générer la voix off après validation des captures finales.

---

## Règles de Capture

- Capturer en vraie vue mobile.
- Utiliser `http://localhost:3000`.
- Ne pas enregistrer tant que le parcours n'est pas testé manuellement.
- Ne pas cliquer trop vite.
- Faire une pause après chaque sélection importante.
- La flèche doit pointer précisément vers le bouton filtre.
- Les filtres **Maison**, **À louer**, **Estuaire** et **Libreville** doivent être visibles.
- Les résultats filtrés doivent apparaître sans actualiser la page.
- Dans la fiche détail, terminer sur les boutons appel et WhatsApp visibles.

---

## Plan Technique Après Validation

Quand ce script est validé :

1. adapter `capture.mjs` pour enregistrer le parcours en séquences courtes ;
2. vérifier chaque séquence visuellement ;
3. assembler la vidéo ;
4. générer la voix off en dernier pour qu'elle colle aux durées réelles ;
5. vérifier la vidéo finale sur mobile avant livraison.

---

## Critère de Réussite

La vidéo est réussie si, sans écouter la voix off, on comprend :

- l'utilisateur cherche un studio avec la barre de recherche ;
- il consulte les premiers résultats ;
- il ouvre une annonce ;
- il revient ensuite aux filtres ;
- il cherche une maison à louer ;
- il choisit **Estuaire** puis **Libreville** ;
- il applique les filtres ;
- il scrolle les résultats filtrés ;
- il ouvre une annonce filtrée ;
- il voit comment appeler ou contacter l'annonceur par WhatsApp.
