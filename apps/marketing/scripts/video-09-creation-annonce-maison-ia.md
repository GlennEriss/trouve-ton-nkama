# Vidéo 9 — Créer une annonce de maison avec l'assistant IA
**"Publier plus vite avec l'assistant"**

- Format : 9:16 vertical, 1080 x 1920 px
- Durée cible : 60 à 80 secondes
- Type : vraie capture mobile de l'app en localhost
- Environnement : `http://localhost:3000`
- Page principale : `/property/add/home`
- Objectif : montrer comment créer une annonce de maison à louer avec l'assistant IA
- Règle : montrer que l'IA aide à préremplir, mais que l'annonceur vérifie avant de publier
- Règle : ne pas produire la vidéo tant que ce script n'est pas validé

---

## Intention

Cette vidéo doit répondre simplement à la question :

> "Comment je peux créer mon annonce plus rapidement avec l'assistant IA ?"

On montre que l'annonceur peut décrire son logement en langage simple, ajouter les photos, laisser l'assistant remplir une partie du formulaire, puis vérifier les informations avant publication.

Le message doit rester simple :

> "Vous décrivez le logement, l'assistant prépare l'annonce, puis vous vérifiez et publiez."

---

## Données d'exemple

Annonce utilisée pour la démonstration :

- Type : `Maison`
- Statut : `À louer`
- Titre attendu : `Maison à louer à Alenakiri`
- Description source IA :

```text
Maison à louer à Alenakiri, voie secondaire.
2 chambres, 1 salon, 1 cuisine, douche et WC interne.
Prix : 140000 FCFA par mois.
Située à Owendo, province Estuaire.
Quartier accessible, voie secondaire.
Contact : 077413382.
Je suis le propriétaire direct.
```

- Superficie à vérifier : `120`
- Province : `Estuaire`
- Ville : `Owendo`
- Quartier : `Alenakiri`
- Contact : `077413382`
- Rôle : `Propriétaire direct`

---

## Parcours Validé

### Étape 1 — Introduction

But : annoncer le sujet.

Action écran :

1. afficher une carte courte avec le logo ;
2. texte écran : **Créer une annonce avec l'IA** ;
3. sous-texte : **Décrivez le logement, l'assistant prépare le formulaire** ;
4. rester environ six secondes.

Voix off :

> "Vous voulez publier une maison à louer plus rapidement ? Avec l'assistant IA de Trouve Ton Nkama, vous décrivez le logement et il prépare l'annonce."

Overlay :

> **Assistant IA**

Durée : 6 secondes.

---

### Étape 2 — Ouvrir la page maison

But : montrer qu'on est sur le bon formulaire.

Action écran :

1. ouvrir `http://localhost:3000/property/add/home` ;
2. attendre que la page soit chargée ;
3. montrer le haut du formulaire maison ;
4. laisser apparaître le bouton de l'assistant IA.

Voix off :

> "On part de la page de création d'une annonce maison."

Overlay :

> **Maison**

Durée : 5 secondes.

---

### Étape 3 — Ouvrir l'assistant IA

But : montrer où se trouve l'assistant.

Action écran :

1. mettre une flèche ou un encadré sur le bouton bot ;
2. cliquer sur le bouton de l'assistant ;
3. attendre l'ouverture du panneau **Assistant IA** ;
4. laisser lire le message d'accueil.

Voix off :

> "Appuyez sur l'assistant IA. Il va vous aider à remplir l'annonce à partir d'une simple description."

Overlay :

> **Ouvrir l'assistant**

Durée : 7 secondes.

---

### Étape 4 — Ajouter les photos dans l'assistant

But : montrer que l'assistant peut aussi recevoir les images.

Action écran :

1. cliquer sur le bouton `+` dans le panneau de l'assistant ;
2. sélectionner quelques photos du logement ;
3. attendre l'apparition des miniatures ;
4. ne pas aller trop vite.

Voix off :

> "Ajoutez les photos du logement directement dans l'assistant."

Overlay :

> **Photos**

Durée : 8 secondes.

---

### Étape 5 — Décrire le logement

But : montrer que l'annonceur écrit naturellement.

Action écran :

1. cliquer dans la zone **Décrivez votre logement...** ;
2. coller ou taper lentement la description source ;
3. laisser une demi-seconde pour lire ;
4. cliquer sur le bouton d'envoi.

Voix off :

> "Ensuite, décrivez le logement avec les informations importantes : prix, quartier, pièces, contact et rôle sur le bien."

Overlay :

> **Décrire le logement**

Durée : 14 secondes.

---

### Étape 6 — Laisser l'assistant générer

But : montrer que l'IA travaille.

Action écran :

1. montrer l'état de chargement ou de réflexion ;
2. attendre le toast ou la fermeture du panneau ;
3. ne pas cliquer pendant la génération.

Voix off :

> "L'assistant analyse la description et prépare les champs de l'annonce."

Overlay :

> **Génération**

Durée : 8 secondes.

---

### Étape 7 — Vérifier les informations préremplies

But : rappeler que l'annonceur garde le contrôle.

Action écran :

1. montrer les photos et les champs préremplis ;
2. vérifier le titre ;
3. vérifier la description ;
4. vérifier le prix ;
5. sélectionner ou confirmer **À louer** ;
6. mettre en valeur **Votre rôle sur ce bien** ;
7. sélectionner **Propriétaire direct** si nécessaire.

Voix off :

> "Avant de publier, vérifiez toujours les informations générées. Confirmez aussi votre rôle : propriétaire direct permet d'afficher ce tag sur l'annonce."

Overlay :

> **Vérifier**

Durée : 14 secondes.

---

### Étape 8 — Compléter ce qui manque

But : montrer que l'IA aide, mais que l'annonceur finalise.

Action écran :

1. passer à l'étape des caractéristiques ;
2. compléter les champs manquants si nécessaire ;
3. passer à la localisation ;
4. vérifier **Estuaire**, **Owendo**, **Alenakiri** ;
5. remplir les informations complémentaires et le contact si nécessaire.

Voix off :

> "Si un champ manque, complétez-le simplement. L'assistant accélère la création, mais vous gardez la main."

Overlay :

> **Compléter**

Durée : 12 secondes.

---

### Étape 9 — Publier l'annonce

But : montrer l'action finale.

Action écran :

1. descendre au bouton final ;
2. cliquer sur **Enregistrer** ;
3. attendre le retour visuel ou la redirection ;
4. ne pas couper trop vite après le clic.

Voix off :

> "Quand tout est correct, appuyez sur enregistrer pour publier votre annonce."

Overlay :

> **Publier**

Durée : 8 secondes.

---

### Étape 10 — Conclusion

But : finir avec la marque.

Action écran :

1. afficher une carte finale avec le logo ;
2. afficher le nom de la plateforme ;
3. afficher **Disponible sur tonnkama.com**.

Voix off :

> "Trouve Ton Nkama. Publiez vos annonces plus facilement sur tonnkama.com."

Overlay :

> **tonnkama.com**

Durée : 8 secondes.

---

## Notes importantes

- Faire la vidéo en vue mobile.
- Montrer clairement le bouton de l'assistant IA.
- Ne pas présenter l'IA comme magique : dire qu'il faut vérifier avant publication.
- La voix off doit être synchronisée avec les actions.
- Si l'assistant ne remplit pas parfaitement la localisation, corriger manuellement.
- Si l'assistant crée une vraie annonce, utiliser une annonce de test ou supprimer l'annonce après la capture.
- Garder le rythme plus court que la vidéo 8 : l'intérêt de cette vidéo est de montrer le gain de temps.
