# Lot 8E - Recherche, consultation et couts du catalogue

Date d'execution : 2026-07-20.

## Objectif

Verifier le circuit public allant des filtres de recherche a la consultation d'une annonce,
sur mobile et desktop. Le lot couvre aussi la pagination du catalogue, la carte et les
statistiques afin qu'un rechargement ou un double clic ne multiplie pas les lectures et
ecritures Firebase.

## Perimetre automatise

- construction et echappement des filtres Algolia ;
- rejet des nombres negatifs, non finis ou contenant une expression injectee ;
- normalisation des bornes du formulaire sans valeur `Infinity` ;
- effacement complet du contexte Algolia et navigation mobile sans rechargement ;
- etats chargement, erreur avec nouvelle tentative et aucun resultat ;
- pagination catalogue par ID de document, limites de 1 a 50 et arret en fin de liste ;
- requete carte limitee a 200 annonces approuvees et en cours ;
- identification opaque du visiteur et refus du `userId` fourni par le client ;
- deduplication des vues pendant six heures et des doubles interactions pendant dix secondes ;
- rendu d'une vraie annonce temporaire Firebase Dev et page introuvable en `noindex`.

## Defauts corriges

1. Les valeurs numeriques de l'URL etaient injectees directement dans le filtre Algolia.
   Elles sont maintenant converties en nombres finis et positifs avant utilisation.
2. Le formulaire pouvait ecrire `Infinity` dans les champs maximum et conserver d'anciens
   filtres vides dans le contexte.
3. La recherche mobile utilisait `window.location.href`, rechargeant toute l'application.
   Elle utilise maintenant le routeur Next.js.
4. Les pages affichaient prematurement `Aucun resultat` pendant la requete et ne proposaient
   pas de recuperation en cas d'erreur Algolia.
5. Chaque rechargement d'une annonce pouvait incrementer une vue et relire Firestore.
   Une reservation persistante cote navigateur et atomique cote serveur bloque les doublons.
6. Les API de statistiques acceptaient un `userId` arbitraire. Elles utilisent desormais une
   empreinte visiteur validee et hachee par le serveur.
7. Le carrousel envoyait `limit` alors que l'API lisait `limitPerPage`, et renvoyait un
   `DocumentSnapshot` non serialisable comme curseur. Le contrat utilise maintenant l'ID.
8. Les limites catalogue et carte n'etaient pas suffisamment bornees cote serveur.

## Resultats

| Verification | Resultat |
| --- | --- |
| Tests metier/API/DB cibles Lot 8E | 30/30 PASS |
| Playwright recherche et consultation | 4/4 PASS |
| Consultation avec vraie annonce Firebase Dev | PASS |
| Nettoyage annonce, utilisateur et statistiques temporaires | PASS |
| TypeScript | PASS |
| Suite CI application | 353 PASS, 6 ignores |
| Couverture lignes globale | 14,45 % |
| Couverture fonctions globale | 31,66 % |
| Couverture branches globale | 50,76 % |

## Commandes

```bash
cd apps/location-maison
npm run test:e2e:lot8e
npm run check:types
npm run test:ci
npm run build
```

## Securite du runner

Le helper E2E refuse tout projet autre que `location-maison-dev`. Il cree une annonce et un
annonceur avec des identifiants uniques, puis supprime ces documents et leurs statistiques.
Algolia est simule dans Playwright pour rendre la recherche deterministe ; la page de detail,
son rendu serveur et l'API annonce utilisent bien Firebase Dev.

## Risque residuel

Le lot ne mesure pas encore la pertinence semantique de l'index Algolia avec un grand volume
de donnees, ni les performances de Leaflet sur un telephone physique. Le statut HTTP d'une
vue `notFound()` peut rester 200 apres le debut du streaming Next.js ; le contenu 404 et la
directive `noindex` sont verifies. La suite conserve l'avertissement React `act(...)`
historique du formulaire d'inscription, sans echec de test.
