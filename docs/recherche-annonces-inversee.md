# Zone "je recherche" (annonces inversées)

## Statut de ce document

**Analyse préliminaire, pas une spec prête à développer.** Contrairement aux Réels
([reels-cadeaux-abonnement.md](./reels-cadeaux-abonnement.md)), le modèle économique de cette
fonctionnalité n'est pas tranché — ce document pose les options plutôt que d'imposer un choix.
À reprendre dans une session dédiée avant de scoper le développement (voir
[10-roadmap.md](./10-roadmap.md) pour où ça se place dans l'ordre de priorité).

## Le concept

Aujourd'hui la plateforme fonctionne dans un seul sens : un annonceur publie, un chercheur
consulte. Cette fonctionnalité inverse le flux : un chercheur publie ce qu'il cherche ("2 chambres
à Awendjé, budget 150k/mois"), et soit les annonceurs répondent directement, soit la demande est
diffusée pour attirer des offres qui n'existent pas encore sur la plateforme.

C'est une vraie proposition de valeur potentielle : ça capture une demande qui aujourd'hui part
directement dans les groupes WhatsApp/Facebook (le problème structurel décrit dans
[01-vision.md](./01-vision.md)) — mais c'est aussi la fonctionnalité la plus incertaine des trois
de ce dossier, précisément parce que la question "qui paie ?" n'a pas de réponse évidente.

## Le dilemme de monétisation

### Option A — Le chercheur paie pour publier sa demande
- **Pour** : filtre naturel contre le spam/les demandes non sérieuses ; revenu immédiat et
  prévisible par publication.
- **Contre** : friction sur exactement l'utilisateur qu'on veut attirer en premier (celui qui
  n'a pas encore trouvé, donc pas encore de raison de faire confiance à la plateforme) — risque
  réel de faire fuir le trafic qu'on cherche à capter depuis les groupes WhatsApp gratuits.

### Option B — L'annonceur paie pour répondre
- **Pour** : cohérent avec le modèle déjà en place (les annonceurs paient déjà pour des crédits/
  fonctionnalités côté admin) ; le chercheur reste gratuit, donc la fonctionnalité reste
  attractive comme point d'entrée.
- **Contre** : risque de "chambre d'écho vide" au lancement — si peu d'annonceurs payants
  répondent, l'expérience chercheur est mauvaise dès le début, ce qui tue l'effet réseau avant
  qu'il démarre. Nécessite une masse critique d'annonceurs déjà engagés avant de lancer.

### Option C — Gratuit des deux côtés, monétisé indirectement
- Le vrai revenu vient d'ailleurs (ex: abonnement Pro décrit dans le document Réels donne accès
  prioritaire aux demandes de recherche, ou aux coordonnées du chercheur). Évite le dilemme
  poule-et-œuf des options A/B, mais dilue la fonctionnalité — elle devient un avantage
  d'abonnement plutôt qu'un produit autonome.

**Pas de recommandation ferme ici** — le bon choix dépend de données qu'on n'a pas encore
(combien de recherches par semaine on peut réalistement attendre, combien d'annonceurs actifs
seraient prêts à payer pour répondre). Option C mérite d'être creusée en premier car elle
s'appuie sur l'infrastructure d'abonnement déjà prévue pour les Réels plutôt que de créer un
troisième système de paiement.

## Partage vers WhatsApp/Facebook

Idée complémentaire mentionnée : permettre de partager une demande de recherche directement dans
les groupes WhatsApp/Facebook d'annonces immobilières existants — génère un lien public
(`/recherche/<id>`) avec un texte pré-formaté, sur le même principe que le bouton WhatsApp des
Réels. Techniquement simple une fois la fonctionnalité de base construite ; l'intérêt stratégique
est réel : ça retourne l'argument "la vraie activité est dans les groupes" en faveur de la
plateforme au lieu de la subir — mais soulève une question de moderation/spam similaire aux
annonces (une demande de recherche mal formulée ou frauduleuse partagée publiquement dans des
groupes tiers a un impact réputationnel plus visible qu'une annonce noyée dans le catalogue).

## Ce qu'il faut clarifier avant de scoper

1. Modèle économique (option A/B/C ci-dessus, ou une combinaison).
2. Modération : une demande de recherche suit-elle le même `moderationStatus` que les annonces,
   ou un contrôle plus léger (moins de risque qu'une annonce frauduleuse, mais un chercheur peut
   quand même publier n'importe quoi) ?
3. Durée de vie d'une demande (expire après combien de temps si aucune réponse ?).
4. Comment un annonceur "répond" concrètement — via un message in-app (nouveau système à
   construire) ou juste un contact WhatsApp direct (plus simple, cohérent avec le reste de la
   plateforme, mais moins traçable pour mesurer si la fonctionnalité marche) ?

Tant que ces points ne sont pas tranchés, cette fonctionnalité reste en dessous des Réels dans
l'ordre de priorité (voir [10-roadmap.md](./10-roadmap.md)) — pas parce qu'elle a moins de valeur,
mais parce qu'elle n'est pas encore scopable.
